import http from "node:http";
import https from "node:https";
import dns from "node:dns/promises";
import { FETCH_TIMEOUT_MS, ImageUrlError, MAX_IMAGE_BYTES, isPublicIp, validateRemoteUrl } from "./image-url";

export type ImageTransportResponse = {
  status: number;
  headers: Record<string, string | undefined>;
  body: Uint8Array;
};

export type ImageTransport = (url: URL) => Promise<ImageTransportResponse>;
export type AddressResolver = (hostname: string) => Promise<string[]>;

export const resolvePublicAddresses: AddressResolver = async (hostname) => {
  const answers = await dns.lookup(hostname, { all: true });
  const addresses = answers.map(({ address }) => address);
  if (!addresses.length || addresses.some((address) => !isPublicIp(address))) {
    throw new ImageUrlError("BLOCKED_HOST", "This image host is not allowed.");
  }
  return addresses;
};

function nodeTransport(resolve: AddressResolver): ImageTransport {
  return async (url) => {
    const addresses = await resolve(url.hostname);
    const address = addresses[0];
    const client = url.protocol === "https:" ? https : http;

    return new Promise((resolveResponse, reject) => {
      const request = client.request(url, {
        method: "GET",
        headers: { accept: "image/jpeg,image/png,image/gif,image/webp,image/avif" },
        // The socket connects to the already-validated IP. For HTTPS, url.hostname
        // remains the TLS SNI/certificate name because hostname verification stays enabled.
        lookup: (_hostname, _options, callback) => callback(null, address, addresses[0].includes(":") ? 6 : 4),
        rejectUnauthorized: url.protocol === "https:",
        servername: url.hostname,
      }, (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_IMAGE_BYTES) {
            response.destroy(new ImageUrlError("TOO_LARGE", "The image is too large."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolveResponse({
          status: response.statusCode || 502,
          headers: {
            "content-type": response.headers["content-type"],
            "content-length": response.headers["content-length"],
            location: response.headers.location,
          },
          body: Buffer.concat(chunks, size),
        }));
        response.on("error", reject);
      });
      request.setTimeout(FETCH_TIMEOUT_MS, () => {
        request.destroy(new ImageUrlError("TIMEOUT", "The image server took too long to respond."));
      });
      request.on("error", reject);
      request.end();
    });
  };
}

export const realImageTransport = nodeTransport(resolvePublicAddresses);

export async function validateAndTransport(url: URL, transport: ImageTransport = realImageTransport) {
  await validateRemoteUrl(url.toString(), async (hostname) => (await resolvePublicAddresses(hostname)).map((address) => ({ address, family: address.includes(":") ? 6 : 4 })));
  return transport(url);
}
