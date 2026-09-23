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

Image downloads accept only public HTTP(S) image URLs. Private/internal hosts, redirects to them, unsupported MIME types, oversized responses, and slow upstreams are rejected. Images are not stored. Social post URLs are not supported.

On iPhone, Safari or an installed PWA may offer the downloaded file through Files or the share sheet rather than silently saving it to Photos. Android browsers commonly place it in Downloads; gallery behavior varies by device.
