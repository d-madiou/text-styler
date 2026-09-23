export type SocialPlatform = "Instagram" | "Facebook" | "X";
const platforms: Record<string, SocialPlatform> = {
  "instagram.com": "Instagram", "www.instagram.com": "Instagram",
  "facebook.com": "Facebook", "www.facebook.com": "Facebook", "m.facebook.com": "Facebook",
  "x.com": "X", "www.x.com": "X", "twitter.com": "X", "www.twitter.com": "X",
};
export type SocialUrlResult = { platform: SocialPlatform; postId: string } | null;
export function parseSocialUrl(value: string): SocialUrlResult {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const platform = platforms[url.hostname.toLowerCase()];
  if (!platform) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const marker = platform === "X" ? "status" : parts.includes("reel") ? "reel" : parts.includes("videos") ? "videos" : "p";
  const id = parts[parts.indexOf(marker) + 1];
  if (!id || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) return null;
  return { platform, postId: id };
}
