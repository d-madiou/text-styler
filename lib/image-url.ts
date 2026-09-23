import dns from "node:dns/promises";
import net from "node:net";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const FETCH_TIMEOUT_MS = 10_000;
export const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google",
]);

function ipv4IsPrivate(ip: string) {
  const octets = ip.split(".").map(Number);
  return (
    octets[0] === 0 ||
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    octets[0] === 192 && octets[1] === 0 && octets[2] === 0 ||
    (octets[0] === 192 && octets[1] === 168) ||
    octets[0] === 198 && octets[1] >= 18 && octets[1] <= 19 ||
    octets[0] >= 224
  );
}

function ipv6IsPrivate(ip: string) {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function isPublicIp(ip: string) {
  return net.isIPv4(ip) ? !ipv4IsPrivate(ip) : net.isIPv6(ip) ? !ipv6IsPrivate(ip) : false;
}

export type Lookup = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

export async function validateRemoteUrl(
  value: string,
  lookup: Lookup = async (hostname) => dns.lookup(hostname, { all: true }),
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ImageUrlError("INVALID_URL", "Enter a valid image URL.");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new ImageUrlError("INVALID_URL", "Only public HTTP or HTTPS image URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (blockedHostnames.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".internal")) {
    throw new ImageUrlError("BLOCKED_HOST", "This image host is not allowed.");
  }

  const addresses = net.isIP(hostname)
    ? [{ address: hostname, family: net.isIPv4(hostname) ? 4 : 6 }]
    : await lookup(hostname);
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new ImageUrlError("BLOCKED_HOST", "This image host is not allowed.");
  }

  return url;
}

export class ImageUrlError extends Error {
  constructor(
    public readonly code: "INVALID_URL" | "BLOCKED_HOST" | "TIMEOUT" | "TOO_LARGE" | "UNSUPPORTED_TYPE" | "UPSTREAM",
    message: string,
  ) {
    super(message);
  }
}

