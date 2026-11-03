# 00 Project discovery
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

## Stack (discovered, not assumed)
| Layer | Finding | Evidence |
|---|---|---|
| Frontend | One hand-written single-page app: `bud-and-things/prototype/index.html` (~5,000 lines, ~680 KB source, inline script lines ~1100–4930), plus `db.js`, `invoice.js`, `import.js`, `config.js`, `products3d.js`, `room3d.js`. Hash routes, no framework. | STATIC |
| Vendored libraries | three.js (3D room), qrcode.js. No version manifest (finding F-17). | STATIC |
| Backend / DB | Supabase (Postgres + RLS + Edge Functions). `schema.sql` 1,171 lines, 25 tables, 25 `enable row level security`, 38 policies, 51 functions. Project `cgccziskvqyatrjqdtka`. | STATIC |
| Edge functions | `pay` (Razorpay, 100 lines), `delivery` (Shiprocket, 133), `notify` (messages, 131), `_shared/util.ts` (59). | STATIC |
| Payments | Razorpay (test mode in repo; owner reports a live test done on 2026-11-03, not independently verifiable). Cashfree removed. PayU is not in the repo. | STATIC + owner statement |
| Shipping | Shiprocket via `delivery` function. | STATIC |
| Media | Cloudinary (unsigned preset) and Supabase storage. | STATIC |
| Hosting | GitHub Pages, custom domain, Fastly edge. Deployed by `.github/workflows/pages.yml` on push to main and daily. | VERIFIED (headers: `server: GitHub.com`, `x-served-by: cache-…`) |
| Build | `pages.yml` assembles `_site`, adds catalogue pages, rebuilds catalogue list from DB (`tools/catalogue-live.js`), product pages and feeds (`build-pinterest.js`), moves app script to a minified file (`split-js.js`), adds CSP meta with script hashes (`add-csp.js`). | STATIC |
| CI | `audit.yml`: page audit, import, invoice, catalogue-live and end-to-end flow tests (Playwright 1.49.1) on PRs touching prototype or tools. | STATIC |
| Git | 97+ commits on main; recent PRs #72–#92. Working tree clean at start (branch reset to origin/main). | VERIFIED |

## Entry points
`/` (app), `/catalogue/` (+ `share/`, `light/`, `diwali/`), `/p/<id>/` product pages, `/pinterest/*.xml`, `robots.txt`, `sitemap.xml`.

## Differences between the brief and the repository
1. Brief lists brand colours Ivory/Sand/Terracotta/Olive/Chocolate/Brass. The repo's live skin is **Silk, Maroon & Gold** (maroon #8F1834, dark maroon #7A1229, gold #D6A34A, cream #F8F0E4, ink #150206). Older skins still exist in CSS. The owner's standing rule is Silk as the only primary brand; this audit measured against Silk.
2. Brief says payment gateway not live and Cashfree/PayU in discussion. Repo uses **Razorpay**; owner reports a live refund test today (see 15).
3. GST off until the ₹40 lakh threshold is an accepted business position, not a defect.

## Technical debt noticed
Single 5,000-line file; vendored libs without versions; the 404-flake root cause in CI never fully proven (see 24).
