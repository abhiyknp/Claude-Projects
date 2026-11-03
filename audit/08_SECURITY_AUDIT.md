# 08 Security audit (passive and static; nothing exploited)
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

## Verified live
- HTTPS site served by GitHub Pages behind Fastly. Response headers seen: no `Strict-Transport-Security`, no `X-Frame-Options`, no response-header CSP; `access-control-allow-origin: *` on static files (GitHub default). **VERIFIED.**
- CSP is delivered as a meta tag: `default-src 'self'`, script-src `'self'` + two script hashes + Facebook, GTM, Razorpay; `style-src 'unsafe-inline'`; `img-src … https:`. A meta CSP cannot set `frame-ancestors`, so **clickjacking is not prevented** (F-06/F-18). **VERIFIED.**
- `robots.txt` has no sensitive paths. No source maps found in the main page response (not exhaustively crawled).

## Static
- No committed secrets: pattern scan for Razorpay live/test keys, service-role keys, JWTs. Only the public anon key in `config.js` (public by design) and documentation mentions of key prefixes. **PASS (F-15).**
- Webhook signature verified with HMAC and constant-time compare; visitor rate limits; owner-only endpoints check `is_owner()`. **PASS (STATIC).**
- XSS: templates escape output; catalogue builder escapes names. **PASS (STATIC + unit test).**
- Owner sign-in has no second factor (`ownerTwoStep: false`, F-07).
- GitHub Actions: `audit.yml` uses `permissions: contents: read`. `pages.yml` permissions not re-reviewed this pass.

## Not tested
TLS grade, HSTS preload, DNS (CAA/SPF/DKIM/DMARC), live RLS probe, dependency CVE scan for vendored three.js/qrcode.js (no versions recorded, F-17), CSRF on edge functions beyond CORS review, rate limits on live.

## Independent validation note (2026-11-03)
- Missing HSTS and frame protection re-checked on `/` and `/catalogue/`: absent through the sandbox proxy. Confidence lowered to **Medium**: a proxy could alter headers, so confirm from a normal network (`curl -I https://budandthings.com/`).
- `pages.yml` permissions now reviewed: `contents: read`, `pages: write`, `id-token: write` (what Pages deployment needs). PASS. The earlier line "not re-reviewed" is superseded.
- Preview code: the site stores a SHA-256 hash; an old readable code still works until a new one is made (F-08 CONFIRMED).
