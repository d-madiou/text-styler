import { describe, expect, it } from "vitest";
import { parseSocialUrl } from "./social-url";

describe("social URL parsing", () => {
  it("recognizes exact supported post hosts and IDs", () => {
    expect(parseSocialUrl("https://www.instagram.com/p/ABC_123/")?.platform).toBe("Instagram");
    expect(parseSocialUrl("https://x.com/user/status/123456")).toEqual({ platform: "X", postId: "123456" });
  });
  it("rejects lookalikes, non-HTTPS URLs, credentials, and malformed IDs", () => {
    expect(parseSocialUrl("https://instagram.com.evil.example/p/ABC")).toBeNull();
    expect(parseSocialUrl("http://instagram.com/p/ABC")).toBeNull();
    expect(parseSocialUrl("https://user:pass@x.com/user/status/123")).toBeNull();
    expect(parseSocialUrl("https://www.facebook.com/p/not valid")).toBeNull();
  });
});
