# 23 Analytics audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

Code supports Meta Pixel, GA4 (ID pattern `G-…`) and events (view, add to cart, checkout, purchase) behind settings (STATIC). Whether IDs are set, consent is collected, or events fire live: NOT TESTED / NOT ASSESSABLE. CSP allows `connect.facebook.net` and Google Tag Manager. Search Console: no access. Error monitoring: none found.
