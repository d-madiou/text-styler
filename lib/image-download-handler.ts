import { ImageUrlError, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES, validateRemoteUrl } from "./image-url";
import { parseSocialUrl } from "./social-url";
import { ImageTransport, ImageTransportResponse, validateAndTransport } from "./image-transport";
import type { Lookup } from "./image-url";

const typeExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4" };
function looksLikeImage(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (type === "image/gif") return new TextDecoder().decode(bytes.slice(0, 6)) === "GIF87a" || new TextDecoder().decode(bytes.slice(0, 6)) === "GIF89a";
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (type === "image/avif") return new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
  if (type === "video/mp4") return new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
  return false;
}
function errorResponse(error: ImageUrlError) {
  const status = error.code === "INVALID_URL" ? 400 : error.code === "BLOCKED_HOST" ? 403 : error.code === "TOO_LARGE" ? 413 : error.code === "UNSUPPORTED_TYPE" ? 415 : error.code === "TIMEOUT" ? 504 : 502;
  return Response.json({ error: error.message }, { status, headers: { "cache-control": "no-store" } });
}
export async function handleImageDownload(request: Request, transport: ImageTransport = validateAndTransport, lookup?: Lookup) {
  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) return errorResponse(new ImageUrlError("INVALID_URL", "Enter an image URL."));
  try {
    const social = parseSocialUrl(rawUrl);
    if (social) throw new ImageUrlError("UPSTREAM", social.platform + " post downloads require official API authorization, which is not configured.");
    let target = await validateRemoteUrl(rawUrl, lookup);
    let response: ImageTransportResponse | undefined;
    for (let redirects = 0; redirects <= 3; redirects++) {
      try { response = await transport(target); }
      catch (error) {
        if (error instanceof ImageUrlError) throw error;
        throw new ImageUrlError("UPSTREAM", "The image could not be downloaded.");
      }
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      if (redirects === 3) throw new ImageUrlError("UPSTREAM", "Too many redirects.");
      const location = response.headers.location;
      if (!location) throw new ImageUrlError("UPSTREAM", "The image server returned an invalid redirect.");
      target = await validateRemoteUrl(new URL(location, target).toString(), lookup);
    }
    if (!response || response.status < 200 || response.status >= 300) throw new ImageUrlError("UPSTREAM", "The image could not be downloaded.");
    const type = (response.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (!SUPPORTED_IMAGE_TYPES.has(type) && !SUPPORTED_VIDEO_TYPES.has(type)) throw new ImageUrlError("UNSUPPORTED_TYPE", "That URL did not return a supported image or MP4 video.");
    const length = Number(response.headers["content-length"]);
    const maxBytes = SUPPORTED_VIDEO_TYPES.has(type) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if ((Number.isFinite(length) && length > maxBytes) || response.body.byteLength > maxBytes) throw new ImageUrlError("TOO_LARGE", "This media file is too large to download safely.");
    if (!response.body.length || !looksLikeImage(response.body, type)) throw new ImageUrlError("UNSUPPORTED_TYPE", "The response was not a valid image.");
    return new Response(Buffer.from(response.body), { headers: { "cache-control": "no-store", "content-type": type, "content-disposition": `attachment; filename="download.${typeExtensions[type]}"`, "content-length": String(response.body.byteLength), "x-content-type-options": "nosniff" } });
  } catch (error) {
    return errorResponse(error instanceof ImageUrlError ? error : new ImageUrlError("UPSTREAM", "The image could not be downloaded."));
  }
}
