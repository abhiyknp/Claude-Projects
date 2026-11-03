# 12 SEO audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

- Title, meta description, canonical (`https://budandthings.com/`), and robots all present on `/` (VERIFIED). Lighthouse SEO 100 on mobile and desktop.
- Sitemap lists `/` only (A-03): expected while Coming soon hides products; `build-pinterest.js` adds every live product page after launch. Retest after launch.
- Product pages `/p/<id>/` exist as static pages (200). Whether they carry Product schema: NOT VERIFIED this pass (the code builds an AggregateOffer JSON-LD, STATIC).
- Catalogue page has title, description, canonical, Open Graph and Twitter tags (STATIC in `build-catalogue.py`).
- `/catalogue/light/` has 6 H1 elements (A-02, Low).
- Hash routes in the app are not separately indexable; static pages cover that.
- Search Console / indexing status: NOT ASSESSABLE (no access). No ranking claims made.

## Independent validation note (2026-11-03)
`/catalogue/light/` has 6 H1 elements CONFIRMED live, but they appear to be steps of a wizard where one is visible at a time. Downgraded to Informational.
