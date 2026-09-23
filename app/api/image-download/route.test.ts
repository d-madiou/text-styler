import { describe, expect, it } from "vitest";
import { ImageTransport } from "../../../lib/image-transport";
import { ImageUrlError, MAX_IMAGE_BYTES } from "../../../lib/image-url";
import { handleImageDownload } from "../../../lib/image-download-handler";

const request = (url: string) => new Request("https://text-styler.test/api/image-download?url=" + encodeURIComponent(url));
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];
const response = (status: number, body = png, headers: Record<string, string> = { "content-type": "image/png" }) => ({ status, body, headers });

describe("image download route", () => {
  it("pins the connection to the address selected at connection time", async () => {
    const connected: string[] = [];
    const transport: ImageTransport = async (url) => { connected.push(url.hostname); return response(200); };
    const result = await handleImageDownload(request("https://rebound.example/image.png"), transport, publicLookup);
    expect(result.status).toBe(200);
    expect(connected).toEqual(["rebound.example"]);
  });
  it("rejects a connection-time resolution that changes to a private address", async () => {
    const privateResolver = async () => [{ address: "127.0.0.1", family: 4 }];
    const result = await handleImageDownload(request("https://rebound.example/image.png"), async () => { throw new Error("must not connect"); }, privateResolver);
    expect(result.status).toBe(403);
  });
  it("rejects redirects to mapped IPv6, loopback, and link-local addresses", async () => {
    for (const destination of ["http://[::ffff:127.0.0.1]/secret", "http://[::1]/secret", "http://[fe80::1]/secret"]) {
      let calls = 0;
      const transport: ImageTransport = async () => { calls++; return { status: 302, body: new Uint8Array(), headers: { location: destination } }; };
      const result = await handleImageDownload(request("https://93.184.216.34/redirect"), transport);
      expect(result.status).toBe(403);
      expect(calls).toBe(1);
    }
  });
  it("rejects unsupported MIME responses and oversized responses", async () => {
    const html: ImageTransport = async () => response(200, new TextEncoder().encode("<html>"), { "content-type": "text/html" });
    expect((await handleImageDownload(request("https://93.184.216.34/page"), html)).status).toBe(415);
    const large: ImageTransport = async () => response(200, png, { "content-type": "image/png", "content-length": String(MAX_IMAGE_BYTES + 1) });
    expect((await handleImageDownload(request("https://93.184.216.34/large.png"), large)).status).toBe(413);
  });
  it("returns a safe error for a transport timeout", async () => {
    const timeout: ImageTransport = async () => { throw new ImageUrlError("TIMEOUT", "The image server took too long to respond."); };
    const result = await handleImageDownload(request("https://93.184.216.34/slow.png"), timeout);
    expect(result.status).toBe(504);
  });
  it("downloads a valid public image with attachment headers", async () => {
    const result = await handleImageDownload(request("https://93.184.216.34/image.png"), async () => response(200));
    expect(result.status).toBe(200);
    expect(result.headers.get("content-disposition")).toContain("attachment");
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(png);
  });
});
