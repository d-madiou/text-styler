import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const request = (url: string) => new Request("https://text-styler.test/api/image-download?url=" + encodeURIComponent(url));
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);

describe("image download route", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("downloads a valid image with attachment headers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(png, { headers: { "content-type": "image/png" } })));
    const response = await GET(request("https://93.184.216.34/image.png"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
  });
  it("rejects unsupported MIME responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { headers: { "content-type": "text/html" } })));
    expect((await GET(request("https://93.184.216.34/page"))).status).toBe(415);
  });
  it("rejects responses over the maximum size before reading the body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(png, {
      headers: { "content-type": "image/png", "content-length": String(10 * 1024 * 1024 + 1) },
    })));
    expect((await GET(request("https://93.184.216.34/large.png"))).status).toBe(413);
  });
  it("rejects redirects to internal hosts before fetching them", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } })));
    expect((await GET(request("https://93.184.216.34/redirect"))).status).toBe(403);
  });
  it("returns a safe error for an upstream timeout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("aborted", "AbortError"); }));
    const response = await GET(request("https://93.184.216.34/slow.png"));
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: "The image server took too long to respond." });
  });
});
