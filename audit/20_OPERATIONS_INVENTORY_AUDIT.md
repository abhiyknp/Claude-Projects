# 20 Operations and inventory audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

- Stock is one count per SKU across channels, editable in Owner view; zero shows Sold out and collects restock requests (STATIC + mock test). SKU scheme `BNT-PRD-<type>-<n>` is consistent in the catalogue (VERIFIED).
- A missing stock row = sold out; new products need a stock entry.
- Batch tracking, supplier records, procurement, SOPs, returns handling: NOT ASSESSABLE (no documents).
