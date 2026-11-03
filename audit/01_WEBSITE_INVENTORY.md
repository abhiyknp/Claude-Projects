# 01 Website inventory
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

Crawl method: live HTTP checks plus a headless Chromium sweep of 6 URLs × 8 widths (48 page views), plus route list from code. The shop is a hash-route single-page app, so most "pages" are not separate URLs.

| ID | Page | URL | Purpose | Status | Result |
|---|---|---|---|---|---|
| P01 | Home / Coming soon | `/` | App shell; shows Coming soon while `comingSoon` is on | VERIFIED 200, 107 KB | Coming soon state seen. In this sandbox the shop data host is blocked, so the "We're having trouble loading" banner also showed (environment artefact, see A-01). |
| P02 | www redirect | `https://www.budandthings.com/` | Canonical host | VERIFIED 301 → apex | Pass |
| P03 | Catalogue | `/catalogue/` | Prices for every published piece | VERIFIED 200, 34 pieces (27 in stock, 7 sold out, 0 upcoming), all with photos | Pass |
| P04 | Share, Light, Diwali | `/catalogue/share/ light/ diwali/` | Social share pages | VERIFIED 200 | `light` has 6 H1 elements (A-02) |
| P05 | Product page | `/p/bnt-prd-cg-001/` | Static product page for search | VERIFIED 200, 3 KB | Pass |
| P06 | 404 | `/nonexistent-page` | Error page | VERIFIED 404, 9 KB branded | Pass |
| P07 | robots.txt | `/robots.txt` | Crawl rules | VERIFIED: `Allow: /` + sitemap | Pass |
| P08 | sitemap.xml | `/sitemap.xml` | Index | VERIFIED: lists `/` only | Expected while Coming soon is on (A-03) |
| P09 | Pinterest feed | `/pinterest/products.xml` | Feed | VERIFIED 200, 423 B (empty while Coming soon) | Expected |
| P10 | Shop, product, cart, checkout, account, orders, admin, policies (`#privacy #terms #shipping #refunds #faq`), finder, gifting | hash routes in app | Shop | STATIC + local mock flow pass | Live version NOT TESTED (shop data host unreachable from sandbox) |
| P11 | `http://` redirect | `http://budandthings.com/` | HTTPS enforcement | NOT TESTED (port 80 blocked by sandbox, code 000) | |
| P12 | Social links | Instagram, Pinterest | Presence | NOT TESTED (hosts not allow-listed) | |

Orphan/dev pages: none found at the URL level. Admin is inside the app behind owner sign-in (static review; live NOT TESTED).
