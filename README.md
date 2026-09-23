# Text Styler

A simple PWA built with Next.js that converts normal text into stylish Unicode text for social media platforms like Instagram, Facebook, WhatsApp, and Twitter/X.

## Features

- Unicode bold text generator
- French character support
- Copy styled text
- Mobile responsive
- PWA installable
- Direct public image URL download through a bounded server-side proxy
- Built with Next.js and Tailwind CSS

## Development

Run npm run dev for local development. Validate with npm run lint, npm run typecheck, npm test, and npm run build.

Image downloads accept only public HTTP(S) image URLs. The Node route resolves each hostname immediately before opening its socket, rejects every resolved address unless it is public, and passes that validated IP to the HTTP(S) client. HTTPS keeps certificate and hostname verification enabled using the original hostname. Every redirect is revalidated and connected the same way. Private/internal hosts, redirects to them, unsupported MIME types, oversized responses, and slow upstreams are rejected. Images are not stored and request URLs are not logged by the application.

This protects the route from the tested DNS-rebinding window in which validation resolves a public address but connection uses a later private resolution. Vercel’s network/runtime behavior should still be verified in a preview deployment; the application cannot control provider-level egress or DNS infrastructure outside its Node process.

On iPhone, Safari or an installed PWA may offer the downloaded file through Files or the share sheet rather than silently saving it to Photos. Android browsers commonly place it in Downloads; gallery behavior varies by device.
