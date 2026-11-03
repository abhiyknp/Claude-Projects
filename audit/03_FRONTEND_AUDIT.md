# 03 Frontend audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| FE-01 | Single 5,000-line inline script and 680 KB HTML source. Production splits and minifies the script (`split-js.js`), so the page is 107 KB over the wire. | STATIC + VERIFIED size | Low (maintainability) |
| FE-02 | Escaping: every dynamic value in templates goes through `esc()`; new `catalogue-live.js` escapes names (unit test asserts it). | STATIC + test | Pass |
| FE-03 | Photo error handler removes a broken tile image and falls back to the drawing. Other image slots (spotlight) have no such handler. | STATIC | Low |
| FE-04 | New in this cycle: `SNAP_IMG` list of 32 SKUs is hard-coded in `index.html` to show catalogue photos until a product has its own. It goes stale if the catalogue adds photos. | STATIC | Low |
| FE-05 | CI flake: the end-to-end test sometimes saw 404s for `${...}` template text as URLs (page loaded with its script inline). Mitigation: preview now serves the page like production (script in its own file). Root cause not proven; passed on all later runs. | VERIFIED in CI logs | Low |
| FE-06 | Console on live: 7 errors on `/` and `/p/…`, 3 on `/catalogue/` in this sandbox. **All are `ERR_TUNNEL_CONNECTION_FAILED` to the shop-data host and Cloudinary: sandbox allow-list, not site defects** (see A-01). | VERIFIED | Info (false positive) |
| FE-07 | Local mock-database flow: add to cart, validation, UPI order, order page, owner status change, points, stock, finder at 1280 and 390 px: **pass, no console errors**. | VERIFIED | Pass |
| FE-08 | Unit-style tests: import (pass), invoice (pass), live catalogue builder (pass). | VERIFIED | Pass |
| FE-09 | Dead code / unused code scan, bundle analysis, memory leaks. | NOT TESTED | n/a |

## Independent validation note (2026-11-03)
FE-06 CONFIRMED as environment artefact: every failed request in the dig run is `net::ERR_TUNNEL_CONNECTION_FAILED` to the data host or Cloudinary. FE-03 CONFIRMED (the image-error handler only covers `.card .tile`). Status words unchanged.
