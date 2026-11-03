# 06 Functional QA audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

| Area | Result |
|---|---|
| Navigation, header, footer (live) | Coming soon state only. NOT TESTED beyond that. |
| Catalogue (live) | VERIFIED: 34 pieces, prices, photos, sold-out badges, WhatsApp share, copy link buttons present. |
| Shop, cart, checkout, orders, admin (mock database) | VERIFIED pass in `test-flow.js` at 1280 and 390 px (see 07). |
| Newsletter form (live) | NOT TESTED (would write to production). |
| Payments live | NOT TESTED by this audit. Owner reports a live test and refund on 2026-11-03: unverified by the auditor. |
| Shipping booking, notifications | NOT IMPLEMENTED as live-tested; code present (STATIC). |
| Cross-browser | Chromium only. Firefox, Safari, Edge NOT TESTED. |
| Customer accounts, reviews, gift reminders | STATIC only. |
