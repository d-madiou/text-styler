# Text Styler

A simple PWA built with Next.js that converts normal text into stylish Unicode text for social media platforms like Instagram, Facebook, WhatsApp, and Twitter/X.

## Features

- Unicode bold text generator
- French character support
- Copy styled text
- Mobile responsive
- PWA installable
- Direct public image URL download through a bounded server-side proxy
- Direct MP4 URL download with the same SSRF protections
- Built with Next.js and Tailwind CSS

## Development

Run npm run dev for local development. Validate with npm run lint, npm run typecheck, npm test, and npm run build.

Direct downloads accept public HTTP(S) image URLs and MP4 video URLs. Images and MP4 files are conservatively limited to 10 MB by the current Vercel-compatible bounded transport. The Node route resolves each hostname immediately before opening its socket, rejects every resolved address unless it is public, and passes that validated IP to the HTTP(S) client. HTTPS keeps certificate and hostname verification enabled using the original hostname. Every redirect is revalidated and connected the same way. Private/internal hosts, redirects to them, unsupported MIME/signature mismatches, oversized responses, and slow upstreams are rejected. Media is not stored and request URLs are not logged by the application.

Instagram, Facebook, and X post URLs are recognized but currently unavailable for media download: this project has no platform credentials or authorization, and it does not scrape pages or use undocumented extractors. A public post URL therefore cannot be treated as a downloadable original image or video. Official API integration would require separate app approval, credentials, permissions, rate-limit handling, and platform-specific media rights.

This protects the route from the tested DNS-rebinding window in which validation resolves a public address but connection uses a later private resolution. Vercel’s network/runtime behavior should still be verified in a preview deployment; the application cannot control provider-level egress or DNS infrastructure outside its Node process.

On iPhone, Safari or an installed PWA may offer the downloaded file through Files or the share sheet rather than silently saving it to Photos. Android browsers commonly place it in Downloads; gallery behavior varies by device.
