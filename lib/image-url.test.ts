import { describe, expect, it } from "vitest";
import { isPublicIp, validateRemoteUrl } from "./image-url";

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

describe("image URL validation", () => {
  it("accepts public HTTP and HTTPS URLs", async () => {
    await expect(validateRemoteUrl("https://example.com/photo.jpg", publicLookup)).resolves.toHaveProperty("hostname", "example.com");
  });
  it("rejects non-HTTP schemes and credentials", async () => {
    await expect(validateRemoteUrl("ftp://example.com/photo.jpg", publicLookup)).rejects.toThrow();
    await expect(validateRemoteUrl("https://user:pass@example.com/photo.jpg", publicLookup)).rejects.toThrow();
  });
  it("rejects internal hostnames and addresses", async () => {
    await expect(validateRemoteUrl("http://localhost/image.png", publicLookup)).rejects.toThrow();
    await expect(validateRemoteUrl("http://127.0.0.1/image.png")).rejects.toThrow();
    await expect(validateRemoteUrl("http://169.254.169.254/image.png")).rejects.toThrow();
    await expect(validateRemoteUrl("http://example.com/image.png", async () => [{ address: "192.168.1.2", family: 4 }])).rejects.toThrow();
    expect(isPublicIp("8.8.8.8")).toBe(true);
    expect(isPublicIp("10.0.0.1")).toBe(false);
    expect(isPublicIp("::1")).toBe(false);
  });
  it("rejects DNS results that include an internal address", async () => {
    await expect(validateRemoteUrl("https://example.com/image.png", async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ])).rejects.toThrow();
  });
});

