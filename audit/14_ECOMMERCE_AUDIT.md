# 14 E-commerce audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

- Catalogue data live: 34 pieces with prices and photos; 7 shown Sold out; "Coming soon" tag supported for upcoming pieces (0 today). VERIFIED.
- Stock model: a product with no stock row counts as 0 and shows Sold out (consistent in shop and catalogue). STATIC. Owner must enter stock for each new product.
- Cart, checkout, order page, invoices, points, coupons: pass on mock DB (T12, STATIC for the rest).
- Product specs: weight, size, burn time, dimensions fields exist in Owner view; completeness per product NOT ASSESSED (no DB access).
- Safety text: care text includes "trim the wick to about 5 mm" and first-burn guidance (STATIC). A full warnings set on packaging/label: NOT ASSESSABLE.
- Prices vs team sheet: owner said they would check; not done by this audit.
