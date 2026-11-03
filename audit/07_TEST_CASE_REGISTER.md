# 07 Test case register
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

| Test ID | Module | Scenario | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| T01 | Live | Home loads over HTTPS | GET / | 200 | 200, 107 KB | Pass |
| T02 | Live | www redirects to apex | GET www | 301 to apex | 301 to https://budandthings.com/ | Pass |
| T03 | Live | Unknown URL returns 404 page | GET /nonexistent-page | 404 | 404, branded | Pass |
| T04 | Live | robots and sitemap | GET both | 200 | 200; sitemap lists `/` only | Pass |
| T05 | Live | HTTP to HTTPS redirect | GET http:// | 301 to https | connection blocked by sandbox | Blocked |
| T06 | Live | TLS certificate details | openssl | valid cert | proxy terminates TLS | Blocked |
| T07 | Live | No horizontal scroll, 8 widths × 6 URLs | Playwright | none | none | Pass |
| T08 | Live | Images have alt | Playwright | all | all | Pass |
| T09 | Live | Console clean | Playwright | no errors | 7 errors, all tunnel-blocked requests to data host/Cloudinary | Blocked (not a defect) |
| T10 | Live | Catalogue lists published pieces with photos | parse HTML | all with photo | 34 pieces, 0 without photo | Pass |
| T11 | Local | Page audit 13 pages × 2 widths | tools/audit.js | pass | pass, 2,577 items | Pass |
| T12 | Local | Shop flow on mock DB at 1280 and 390 | tools/test-flow.js | no errors | ERRORS: none | Pass |
| T13 | Local | Import, invoice, catalogue-live checks | 3 scripts | pass | pass | Pass |
| T14 | Live | Lighthouse mobile | lighthouse 1 run | — | Perf 65, A11y 100, BP 96, SEO 100 | Pass with gaps |
| T15 | Live | Lighthouse desktop | lighthouse 1 run | — | Perf 96, A11y 100, BP 96, SEO 100 | Pass |
| T16 | Live | RLS probe with public key | REST read | no private rows | not run (production-read guard) | Blocked |
| T17 | Live | Checkout, webhook, refund | Razorpay | — | owner-reported only | Not tested |
| T18 | Live | Firefox, Safari, Edge | — | — | not run | Not tested |

Totals: 18 cases. Pass 12, Pass with gaps 1, Blocked 4 (T05, T06, T09, T16), Not tested 2 (T17, T18) — see the execution summary in README for the exact count.
Evidence: logs in this session; screenshots in `audit/screenshots/`; Lighthouse JSON kept in the session scratch area (not committed).

## Independent validation note (2026-11-03)
Totals recounted from the table: 18 cases = 11 Pass + 1 Pass with gaps + 4 Blocked (T05, T06, T09, T16) + 2 Not tested (T17, T18); 0 Fail. The earlier line "Pass 12" counted the gap case as a pass.
