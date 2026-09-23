"use client";

import { useMemo, useState } from "react";

const styles = [
  { id: "boldSans", label: "Bold Sans" },
  { id: "boldSerif", label: "Bold Serif" },
  { id: "italicSerif", label: "Italic Serif" },
  { id: "boldItalicSerif", label: "Bold Italic Serif" },
];

const normal =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ";

const maps: Record<string, string> = {
  boldSans:
    "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ",

  boldSerif:
    "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳0123456789ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ",

  italicSerif:
    "𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧0123456789ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ",

  boldItalicSerif:
    "𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛0123456789ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ",
};

function convertText(text: string, style: string) {
  const map = maps[style];
  if (!map) return text;

  const normalChars = Array.from(normal);
  const styledChars = Array.from(map);

  return Array.from(text)
    .map((char) => {
      const index = normalChars.indexOf(char);
      return index !== -1 ? styledChars[index] : char;
    })
    .join("");
}

export default function Home() {
  const [text, setText] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("boldSans");
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageStatus, setImageStatus] = useState<"idle" | "preview" | "loading" | "success" | "error">("idle");
  const [imageError, setImageError] = useState("");

  const output = useMemo(() => {
    return convertText(text, selectedStyle);
  }, [text, selectedStyle]);

  const handleCopy = async () => {
    if (!output.trim()) return;

    await navigator.clipboard.writeText(output);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleReset = () => {
    setText("");
    setCopied(false);
  };

  const handleImageUrlChange = (value: string) => {
    setImageUrl(value);
    setImageError("");
    setImageStatus(value.trim() ? "preview" : "idle");
  };

  const handleImageDownload = async () => {
    try {
      const parsed = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP and HTTPS image URLs are supported.");
      setImageStatus("loading");
      const response = await fetch("/api/image-download?url=" + encodeURIComponent(imageUrl));
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "The image could not be downloaded.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setImageStatus("success");
    } catch (error) {
      setImageStatus("error");
      setImageError(error instanceof Error ? error.message : "The image could not be downloaded.");
    }
  };

  return (
    <main className="min-h-screen bg-white px-5 py-10 text-black">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex rounded-full bg-red-100 px-4 py-1 text-sm font-semibold text-red-600">
            Unicode Text Generator
          </div>

          <h1 className="text-4xl font-black tracking-tight text-black md:text-6xl">
            Text Styler
          </h1>

          <p className="mt-4 text-base text-zinc-600 md:text-lg">
            Convert normal text into bold Unicode styles that stay formatted on
            Facebook, Instagram, Twitter/X, and WhatsApp.
          </p>
        </div>

        <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-[0_10px_40px_rgba(255,0,0,0.06)] md:p-8">
          <div>
            <label className="mb-3 block text-sm font-bold text-black">
              Enter Text
            </label>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your text here..."
              className="min-h-[150px] w-full rounded-2xl border-2 border-red-100 bg-white p-4 text-lg font-medium text-black placeholder:text-zinc-400 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />
          </div>

          <div className="mt-6">
            <label className="mb-3 block text-sm font-bold text-black">
              Select Style
            </label>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {styles.map((style) => {
                const active = selectedStyle === style.id;

                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold transition ${
                      active
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-red-100 bg-white text-black hover:border-red-300"
                    }`}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <label className="mb-3 block text-sm font-bold text-black">
              Output
            </label>

            <div className="min-h-[150px] rounded-2xl border-2 border-red-100 bg-red-50/50 p-4 text-xl font-medium break-words whitespace-pre-wrap text-black">
              {output || (
                <span className="text-zinc-400">
                  Your styled text will appear here...
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <button
              onClick={handleCopy}
              disabled={!output.trim()}
              className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {copied ? "Copied ✓" : "Copy Styled Text"}
            </button>

            <button
              onClick={handleReset}
              className="rounded-2xl border-2 border-red-200 px-6 py-4 font-bold text-red-600 transition hover:bg-red-50"
            >
              Reset All
            </button>
          </div>

          <div className="mt-10 border-t border-red-100 pt-8">
            <label htmlFor="image-url" className="mb-3 block text-sm font-bold text-black">
              Download an image
            </label>
            <p id="image-url-help" className="mb-3 text-sm text-zinc-600">
              Paste a direct public image URL. Social post links are not supported.
            </p>
            <input
              id="image-url"
              type="url"
              value={imageUrl}
              onChange={(event) => handleImageUrlChange(event.target.value)}
              placeholder="https://example.com/image.jpg"
              aria-describedby="image-url-help image-status"
              className="w-full rounded-2xl border-2 border-red-100 bg-white p-4 text-base text-black placeholder:text-zinc-400 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />

            {imageUrl.trim() && (
              <div className="mt-4 overflow-hidden rounded-2xl border-2 border-red-100 bg-red-50/50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote URLs cannot use next/image without an allowlist */}
                <img
                  src={imageUrl}
                  alt="Preview of the image to download"
                  className="max-h-72 w-full rounded-xl object-contain"
                  onError={() => setImageStatus("error")}
                />
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={handleImageDownload}
                disabled={!imageUrl.trim() || imageStatus === "loading"}
                className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {imageStatus === "loading" ? "Downloading..." : "Download Image"}
              </button>
              <button
                type="button"
                onClick={() => { setImageUrl(""); setImageError(""); setImageStatus("idle"); }}
                className="rounded-2xl border-2 border-red-200 px-6 py-4 font-bold text-red-600 transition hover:bg-red-50"
              >
                Clear URL
              </button>
            </div>

            <p id="image-status" role="status" aria-live="polite" className="mt-3 text-sm text-zinc-600">
              {imageStatus === "success" && "Download started. On iPhone, Safari may offer the file through Files or the share sheet instead of Photos."}
              {imageStatus === "error" && (imageError || "The preview could not be loaded. The download may still work if the URL is a valid image.")}
              {imageStatus !== "success" && imageStatus !== "error" && "Images are fetched securely by the server and are not stored."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
