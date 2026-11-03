# 26 Master findings register
> Audit date 2026-11-03. Test mode only; no production changes; no secrets printed. Status words: VERIFIED, STATIC, NOT TESTED, NOT IMPLEMENTED, NOT ASSESSABLE, N/A.

Columns: ID, domain, where, severity, priority (P0 now, P1 before launch, P2 planned, P3 later), description, recommended fix, effort (XS/S/M), status. Evidence and reproduction are in the domain report named by the ID (security 08/09, performance 10, QA 07). F-xx carried from earlier passes (`risk-register.csv`); A-xx new this pass. Originals are not deleted.

| ID | Domain | Where | Severity | Priority | Description | Fix | Effort | Status |
|---|---|---|---|---|---|---|---|---|
| F-01 | Infra | Domain | Medium | P2 | DNS, TLS details, http→https not checkable from sandbox | Owner: SSL Labs test; confirm GitHub 'Enforce HTTPS' | S | NOT TESTED |
| F-02 | Security | Razorpay test key | High→Medium | P0 | Test secret pasted in chat earlier | Owner regenerates test key (and live key if ever shared) | S | OPEN owner action |
| F-03 | Security | pay function | Medium | P1 | No rate limit; fixed in #74; deploy unverified | Owner `supabase functions deploy pay`; retest 25 rapid calls → 429 | S | FIXED IN REPO, deploy unverified |
| F-04 | Security | pay verify | Medium→Low | P2 | Verify needs order id only | Add phone check if desired | S | OPEN |
| F-05 | Security | CORS | Medium | P1 | `*` until SITE_ORIGINS set | Owner sets SITE_ORIGINS=https://budandthings.com | XS | OPEN owner action |
| F-06/18 | Security | Headers | Medium | P2 | No HSTS/XFO/header-CSP on Pages | Accept, or Cloudflare in front (needs DNS change: ask first) | M | ACCEPTED/OPEN |
| F-07 | Security | Owner sign-in | Medium | P1 | No second factor | Turn on ownerTwoStep + DB function | S | OPEN |
| F-08 | Security | Preview code | Low | P2 | Old code works until changed | Owner sets new code | XS | OPEN |
| F-09 | Quality | test-flow | Medium | — | Stale test | Fixed (#73) | — | CLOSED |
| F-10 | Quality | CI | Low | P2 | Tests not in CI | Added (#73); no lint/CVE scan yet | S | PARTLY CLOSED |
| F-11 | SEO | canonical | Low | — | Canonical missing | Added (#72), VERIFIED live | — | CLOSED |
| F-12 | Reliability | Backups/monitor | Medium | P1 | No evidence of PITR, monitor, restore test | Supabase Pro, UptimeRobot, one restore test | S | OPEN |
| F-13 | E-commerce | Razorpay live | High | P1 | Live flow unverified by auditor; owner reports test+refund today | Provide payment id, webhook log, refund id as evidence | S | OPEN (evidence) |
| F-14 | Compliance | Policies | Info | P1 | Drafts, not legally reviewed | CA/lawyer review | M | OPEN |
| F-15 | Security | Secrets | Info | — | None found | — | — | PASS |
| F-16 | Security | RLS | Info | — | 25 tables RLS (static) | Owner runs anon probe | XS | PASS (static) |
| F-17 | Quality | Vendor libs | Low | P3 | No versions | Add VERSIONS file; check CVEs | XS | OPEN |
| F-19 | Perf | Home mobile | Medium | P2 | 55→65, LCP 6.0 s, TBT 500 ms | Defer JS, lighter first render for Coming soon | M | IMPROVED, OPEN |
| F-20 | SEO | Sitemap | Low | P2 | Home only | Lists products after launch | — | EXPECTED |
| F-21 | Function | Live shop | High→Medium | P1 | Live shop data not testable from sandbox | Allow supabase/razorpay/cloudinary hosts, new session, or owner test | S | OPEN (access) |
| F-22 | Quality | A11y/BP | Info | — | Lighthouse 100/96/100 | — | — | PASS |
| F-23 | Content | Social links | Low | P3 | Unchecked | Click-test | XS | NOT TESTED |
| A-01 | Audit method | Sandbox | Info | — | Console errors and broken catalogue images in this sweep are ERR_TUNNEL_CONNECTION_FAILED to the data host and Cloudinary (sandbox allow-list) | Not a site defect; add hosts or test elsewhere | — | FALSE POSITIVE, closed |
| A-02 | SEO/A11y | /catalogue/light/ | Low | P3 | 6 H1 elements | Use one H1, others H2 | XS | OPEN, VERIFIED |
| A-03 | SEO | sitemap | Info | P2 | Product pages not in sitemap while Coming soon is on | Retest after launch | — | EXPECTED |
| A-04 | Perf | LCP | Medium | P2 | Mobile LCP 6.0 s this run | As F-19 | M | OPEN |
| A-05 | Security | CSP | Low | P3 | `style-src 'unsafe-inline'`, `img-src https:` | Tighten after launch | S | OPEN |
| A-06 | Data | Stock | Low | P2 | New product with no stock row shows Sold out in shop and catalogue | Owner enters stock; consider an Owner-view warning | S | BY DESIGN, noted |
| A-07 | Quality | Hard-coded SKU list | Low | P3 | SNAP_IMG goes stale | Replace with real photos in Owner view | XS | OPEN |
| A-08 | Brief | Facts | Info | P3 | Brief says Terracotta/Chocolate palette, Cashfree/PayU; repo is Silk Maroon & Gold, Razorpay | Update the brief | XS | OPEN |
| A-09 | Test | Cross-browser | Medium | P2 | Only Chromium run | Test Safari/Firefox/Edge before launch | S | NOT TESTED |
| A-10 | Evidence | Live DB probe | Medium | P1 | Blocked by production-read guard | Owner runs anon-key read of orders/customers/coupons | XS | NOT TESTED |

Retest criteria: F-03 → 25 rapid `start` calls return 429; F-05 → request from another origin is refused; F-07 → owner sign-in asks for code; F-12 → restore test succeeds; F-13 → paid order + webhook + refund IDs shown; A-10 → anon read of private tables returns nothing.

## Independent validation note (2026-11-03)
Re-rated by the validation pass: A-02 Low → Informational; F-06/F-18 confidence High → Medium; F-02 stays High pending key regeneration (cannot be checked); F-13 and F-21 stay as evidence gaps, not defects. A-01 CONFIRMED false positive. See `INDEPENDENT_VALIDATION_REPORT.md`.

## Owner update (2026-11-03, owner-reported, NOT independently verified)
| ID | Owner statement | Register status | Still needed to close |
|---|---|---|---|
| F-13 | Live payment test with refund done | OWNER-REPORTED DONE | Payment id, webhook delivery log, refund id, matched amount |
| F-02 | Razorpay key regenerated | OWNER-REPORTED DONE | None from the auditor; cannot be checked here |
| F-03 | `pay` deployed | OWNER-REPORTED DONE | Retest: about 25 rapid `start` calls return 429 |
| F-05 | `SITE_ORIGINS` set | OWNER-REPORTED DONE | Retest: request from another origin is refused |
| F-12 | Backups and uptime monitor: in progress | OPEN, guide issued (`backup-and-uptime-guide.md`) | Pro on, daily backup listed, restore test pass, monitors and test alert |
| F-07 | Owner two-step: to be done last | OPEN, scheduled last | Turn on `ownerTwoStep` and the database function |
