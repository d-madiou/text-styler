# Image download feature plan

## Repository baseline and assumptions

- The app uses the Next.js App Router: the only route is app/page.tsx, and it is a client page. There is no pages directory, app/api route, server action, or other server-side application code.
- next.config.ts has no output: "export"; the scripts use normal next build/next start. This is compatible with a dynamic Next.js deployment on Vercel, including a future app/api/.../route.ts. Actual Vercel project settings are not present and must be confirmed.
- UI is one Tailwind v4 card in app/page.tsx, with local React state, native labels/buttons, and no shared components or validation library. npm run lint is the only automated check; there are no tests or test dependencies.
- PWA behavior comes from app/manifest.ts, app/pwa-registration.tsx, and public/sw.js. The service worker caches the app shell and navigations, but should not cache arbitrary image downloads.
- There is no existing image, social URL, privacy, or server configuration. These observations are the basis for the file suggestions below, not completed implementation.

## Part 1 — Direct image URL download

### Goal and user flow

Add a separate “Download an image” section below the existing text-styler card. The user pastes a URL, receives client-side syntax feedback, and gets a preview after safe validation. Download requests a same-origin Vercel route, which fetches the remote image and returns Content-Disposition: attachment with a safe filename.

Likely files:

- Change app/page.tsx to add the section and isolated state (URL, preview/status/error, downloading), without changing convertText, text state, style selection, copy, or reset behavior.
- Add app/api/image-download/route.ts for the server-side fetch and bounded response.
- Prefer small helpers such as lib/image-url.ts and lib/image-response.ts if validation makes the route unwieldy; no helper exists today.
- Update app/globals.css only if existing Tailwind classes cannot provide the preview/error layout. Do not modify public/sw.js to cache downloaded bytes.

### Route protections and behavior

- Accept only http and https URLs; reject malformed URLs, credentials, fragments if unnecessary, localhost, loopback, link-local, private/RFC1918, metadata, multicast, and other non-public IP ranges after DNS resolution. Re-check redirect destinations and cap redirects at 2–3; do not rely only on hostname string checks.
- Use an explicit outbound timeout via AbortController (for example, 10 seconds), a response-header/body size limit (for example, 10–20 MB, confirmed against Vercel limits), and stream or incrementally read only up to that limit. Never buffer unbounded remote data.
- Require an image content type, allow a documented set such as JPEG, PNG, GIF, WebP, and AVIF, and verify magic bytes where practical rather than trusting extension or header. Reject HTML, SVG, executable/archive content, and empty bodies. Preserve bytes; do not transform images in the MVP.
- Return stable client-safe errors for invalid URL, blocked host, timeout, too large, unsupported type, upstream 4xx/5xx, and unexpected failure. Do not return upstream bodies or internal DNS/network details. Add Cache-Control: no-store; use Content-Type, Content-Length when known, Content-Disposition, and a sanitized extension-based filename.
- Preview can use the original URL only after policy validation; if the host blocks browser image loading or CORS, keep preview unavailable while the server route reports the definitive result. Do not use next/image for arbitrary user-supplied content.

### Dependencies, settings, security and privacy

No new dependency is required: use Web APIs, NextRequest, and NextResponse or a streamed Response. If safe DNS/IP classification cannot be made with Vercel-supported runtime APIs, use a narrowly reviewed maintained SSRF/IP package or restrict the MVP to an allowlist/known public image hosts. Confirm Vercel Node.js runtime, function timeout/memory, region, and response limits; do not use Edge unless the chosen DNS/streaming approach is supported there.

The server proxy exposes the visitor’s request to the image host. Do not log full URLs (query strings may contain tokens); redact host/path as needed, never store image bytes, and document that third-party hosts receive a fetch from the service. Consider rate limiting per IP before public launch.

### Test plan and definition of done

Add route/unit tests once a runner is selected (likely Vitest or Node-compatible tests) covering valid bytes, invalid schemes, private/metadata addresses, redirect-to-private, bad content type/magic bytes, oversized content, timeout, upstream errors, filename sanitization, and successful headers. Add a browser test or manual matrix for paste, preview failure, retry, double-submit, and download.

Done when the current formatter is unchanged; supported direct image URLs preview and download through the same-origin route; unsafe/unsupported/large/slow URLs fail clearly; no arbitrary response is cached or logged; npm run lint and npm run build pass on Vercel settings.

Dependency: none outside the baseline. This part is prerequisite for the social-link decision and final UI.

## Part 2 — Social post URL support

### Goal and user flow

Investigate a pasted public Facebook, Instagram, or X post URL and classify it as supported, unsupported, or requiring an official integration. The MVP must not promise that a generic post URL yields an original downloadable image. If an official mechanism supplies a permitted image URL, route it through Part 1’s validation/download pipeline; otherwise explain the limitation and offer to open the post.

Likely files:

- Add lib/social-url.ts and tests for host/path parsing; keep it separate from direct-image validation.
- Extend app/page.tsx status/help UI only after investigation; do not add scraping logic to the client.
- If an approved official integration is later added, use app/api/social/.../route.ts, server-only platform adapters, and Vercel environment variables.

### Investigation and safe MVP recommendation

- Facebook and Instagram public post URLs generally expose embeds/metadata, not a universally authorized original-image download API. Official Graph APIs require suitable apps, permissions, access tokens, review, and often ownership/access conditions; image URLs can expire and platform privacy rules apply.
- X post URLs do not guarantee media extraction. Official API access, authentication, product tier, endpoint permissions, rate limits, media URL expiry, and visibility determine what can be retrieved. An embed renders a post; it is not permission to download its media.
- HTML scraping, reverse-engineered endpoints, browser automation, and generic third-party extractors are brittle, may bypass access controls, expose user data, and may conflict with platform terms. They also add server-side SSRF, moderation, and availability dependencies. Do not make them the MVP.

Recommended MVP: direct image URLs only, plus recognized social URLs that return “social post links are not supported for image download yet” with an Open link. Add no platform credentials and no scraper. Revisit one platform at a time after confirming current official API permissions, terms, user authorization, media rights, retention rules, cost/rate limits, and a stable test account.

### Dependencies, security/privacy, tests and definition of done

This part depends on Part 1’s safe fetch contract and error taxonomy. No dependency or Vercel setting is needed for the recommended MVP. If official APIs are later approved, keep secrets in Vercel environment variables, never client-side, and isolate each adapter.

Test host parsing (including lookalike domains, short links, query strings, private posts, and unsupported platforms) and verify social URLs never reach the direct-image proxy as if they were image URLs. Done when behavior and copy do not imply scraping or guaranteed extraction, unsupported links are safe and understandable, and any future API scope has explicit legal/product approval and an authentication plan.

## Part 3 — User experience, compatibility and release

### Goal and user flow

Integrate the direct-image feature as a separate section in the existing single-page card. Preserve the formatter and keep Reset All semantics explicit (either reset both tools, or provide separate resets). Provide idle, validating, preview-ready, downloading, success, unsupported-link, and error states; allow retry and clear URL. Offer Download and, where available, Web Share using navigator.share/canShare, with a normal-download fallback.

Likely files:

- Change app/page.tsx for accessible controls, state transitions, preview, status messages, and download/share actions.
- Change app/layout.tsx metadata/description only if image download becomes part of the product description.
- Change app/manifest.ts only if a shortcut or description should mention image download; keep install identity and icons.
- Change public/sw.js only to explicitly bypass caching for /api/image-download if its fetch handler could cache it; never cache user image data.
- Add route/component tests and optionally update README.md for release documentation; this planning task intentionally does not modify it.

### Mobile, accessibility, compatibility and privacy

Use a real label, keyboard-focusable buttons, visible focus styles, aria-describedby for URL guidance, role=status/polite announcements, meaningful preview alt text, and errors that do not rely on color alone. Keep controls usable at small widths and respect reduced motion. Never render untrusted URL text as HTML.

On Android, an attachment download usually appears in Downloads and may be moved to Photos/Gallery depending on browser/device; Web Share can help. On iPhone/iPad, a PWA/browser download may open a download sheet or Files rather than Photos, and a download attribute is not guaranteed to save to the camera roll. Explain Save Image/Files/share steps where appropriate; do not claim automatic gallery saving. Verify Safari PWA, Safari browser, Chrome Android, and one desktop browser. Account for iOS user-gesture requirements, blob cleanup, interrupted downloads, and service-worker interference.

Do not persist URLs, images, or history in local storage. Avoid analytics payloads containing URLs. Treat remote images as untrusted bytes, set conservative headers, and retain Part 1’s SSRF/size/type/rate-limit controls. Confirm whether Vercel logs record query strings and redact or avoid sensitive parameters.

### Dependencies, Vercel settings, tests and definition of done

No UI library is present. Keep Tailwind and native browser APIs unless an approved test/tooling dependency is added. Confirm Vercel builds with next build, uses the Node runtime for the route, has no static-export setting, and has suitable function timeout/memory/region limits. Version the service worker when behavior changes and test a fresh install plus an already-installed PWA.

Test formatter regression (all existing styles, French characters, copy/reset), UI state transitions, accessibility with keyboard/screen-reader checks, route integration, mobile download/share behavior, offline app-shell behavior, and Vercel preview/production builds. Done when existing text conversion and installability remain intact; direct-image paths are clear and accessible; social URLs are honestly unsupported in the MVP; no bytes are cached or retained; lint, build, security tests, and the device matrix pass.

Dependency: Parts 1 and 2 define the route contract and supported-link policy. This part is the release gate.

## Recommended order and first milestone

Implement Part 1’s validation/fetch contract and route tests first, then wire the smallest direct-image UI. Next complete the social URL investigation and unsupported classification (without scraping), and finally finish compatibility/accessibility and Vercel verification in Part 3.

Small first milestone for one developer: add a tested app/api/image-download/route.ts plus a minimal image section in app/page.tsx supporting validated public JPEG/PNG/WebP direct URLs, preview/error/loading/download states, and no social extraction. Verify npm run lint, npm run build, and manual Safari iPhone PWA/Chrome Android behavior before expanding formats or platform integrations.

## Items to confirm before implementation

- The actual Vercel project uses standard Next.js deployment and has no static export or restrictive function limits.
- Desired maximum image size, allowed formats, rate-limit/abuse budget, and whether AVIF/GIF should be included.
- Whether Reset All should clear image state as well as text state.
- Product/legal approval for any future platform API integration and required privacy/terms copy.

