import { ImageUrlError, FETCH_TIMEOUT_MS, MAX_IMAGE_BYTES, SUPPORTED_IMAGE_TYPES, validateRemoteUrl } from "../../../lib/image-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const typeExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

function looksLikeImage(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (type === "image/gif") return new TextDecoder().decode(bytes.slice(0, 6)) === "GIF87a" || new TextDecoder().decode(bytes.slice(0, 6)) === "GIF89a";
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (type === "image/avif") return new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
  return false;
}

async function readBounded(response: Response) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_IMAGE_BYTES) throw new ImageUrlError("TOO_LARGE", "The image is too large.");
  if (!response.body) throw new ImageUrlError("UPSTREAM", "The image could not be downloaded.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) throw new ImageUrlError("TOO_LARGE", "The image is too large.");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url");
  if (!rawUrl) return errorResponse(new ImageUrlError("INVALID_URL", "Enter an image URL."));

  try {
    let target = await validateRemoteUrl(rawUrl);
    let response: Response | undefined;
    for (let redirects = 0; redirects <= 3; redirects++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        response = await fetch(target, {
          redirect: "manual",
          signal: controller.signal,
          headers: { accept: "image/jpeg,image/png,image/gif,image/webp,image/avif" },
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw new ImageUrlError("TIMEOUT", "The image server took too long to respond.");
        throw new ImageUrlError("UPSTREAM", "The image could not be downloaded.");
      } finally {
        clearTimeout(timer);
      }
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      if (redirects === 3) throw new ImageUrlError("UPSTREAM", "Too many redirects.");
      const location = response.headers.get("location");
      if (!location) throw new ImageUrlError("UPSTREAM", "The image server returned an invalid redirect.");
      target = await validateRemoteUrl(new URL(location, target).toString());
    }
    if (!response || !response.ok) throw new ImageUrlError("UPSTREAM", "The image could not be downloaded.");
    const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!SUPPORTED_IMAGE_TYPES.has(type)) throw new ImageUrlError("UNSUPPORTED_TYPE", "That URL did not return a supported image.");
    const bytes = await readBounded(response);
    if (!bytes.length || !looksLikeImage(bytes, type)) throw new ImageUrlError("UNSUPPORTED_TYPE", "The response was not a valid image.");
    return new Response(bytes, {
      headers: {
        "cache-control": "no-store",
        "content-type": type,
        "content-disposition": `attachment; filename="download.${typeExtensions[type]}"`,
        "content-length": String(bytes.byteLength),
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error instanceof ImageUrlError ? error : new ImageUrlError("UPSTREAM", "The image could not be downloaded."));
  }
}

function errorResponse(error: ImageUrlError) {
  const status = error.code === "INVALID_URL" ? 400 : error.code === "BLOCKED_HOST" ? 403 : error.code === "TOO_LARGE" ? 413 : error.code === "UNSUPPORTED_TYPE" ? 415 : error.code === "TIMEOUT" ? 504 : 502;
  return Response.json({ error: error.message }, { status, headers: { "cache-control": "no-store" } });
}
