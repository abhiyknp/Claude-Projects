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
| F-16 | Security | RLS | Info | — | 25 tables RLS (static) | Owner runs anon probe | XS | PASS (static + live probe 2026-11-03) |
| F-17 | Quality | Vendor libs | Low | P3 | No versions | Add VERSIONS file; check CVEs | XS | OPEN |
| F-19 | Perf | Home mobile | Medium | P2 | 55→65, LCP 6.0 s, TBT 500 ms | Defer JS, lighter first render for Coming soon | M | IMPROVED, OPEN |
| F-20 | SEO | Sitemap | Low | P2 | Home only | Lists products after launch | — | EXPECTED |
| F-21 | Function | Live shop | High→Medium | P1 | Live shop data not testable from sandbox | Allow supabase/razorpay/cloudinary hosts, new session, or owner test | S | OPEN (access) |
| F-22 | Quality | A11y/BP | Info | — | Lighthouse 100/96/100 | — | — | PASS |
| F-23 | Content | Social links | Low | P3 | Unchecked | Click-test | XS | PASS (owner ran rls-probe.js, 2026-11-03) |
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

## Fixes made 2026-11-03 (in this PR; re-test after merge and deploy)
| ID | Change | Evidence |
|---|---|---|
| F-17 | `prototype/vendor/VERSIONS.md` records three.js r160 and qrcode-generator 2.0.4; advisory check is manual | file in PR |
| F-10 | `tools/scan-secrets.js` runs in CI on every PR (payment keys, private keys, service-role tokens); proven to fail on a planted key and pass on the repo | local run |
| FE-03 | A photo that fails to load is remembered and the page draws again without it, in every slot (spotlight, product page, tiles). `tools/test-photo-fallback.js` fails before the fix and passes after | local run, in CI |
| F-12 (part) | `.github/workflows/uptime.yml` checks the site and catalogue every 15 minutes and opens or closes an issue. Second line only; the 5-minute monitor and backups stay owner steps | runs after merge |
| A-02 | Not changed: the six headings sit in separate wizard screens, one visible at a time. Re-check with a screen reader | validation note |

## Cannot be fixed in code (owner or access needed)
F-06/F-18 headers on GitHub Pages (needs Cloudflare and a DNS change: ask first); F-07 owner two-step (scheduled last); F-12 Pro plan, backups, restore test, monitor; F-14 legal review; A-09 other browsers; A-10 database privacy probe; F-21 live shop test from an unrestricted network; product safety, costs and inventory records; F-04 `verify` phone check (changes how the shop and the function talk and needs a redeploy; low value, left as is); mobile LCP about 6 s (needs splitting the owner and 3D code out of the main script, a larger change, proposed as its own PR).

## Owner pack added 2026-11-03 (`audit/owner-pack/`)
| Item | What was added | Closes when |
|---|---|---|
| F-06/F-18 headers | Cloudflare step-by-step with rollback (01) | `curl -I` shows HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| A-10 / F-16 database privacy | `bud-and-things/tools/rls-probe.js` (read-only, prints no data) and guide (02) | Owner runs it: RESULT PASS |
| F-21 live shop test | 17-step checklist (03) | Table filled and logged |
| Product safety, costs, inventory | Guide and three CSV templates (04) | Records filled and reviewed |
Sandbox note: the probe could not be run here (production-read guard); it was tested against a local fake server for pass, fail and no-answer cases only.

## Evidence log: database privacy probe (A-10, F-16), 2026-11-03
Run by the owner from a Mac on their own network with the public key, using `tools/rls-probe.js` (read only, prints no rows). Result: PASS. 18 private tables: 16 answered HTTP 200 with 0 rows, 2 (invoice_counters, hits) answered HTTP 401. Public tables returned rows as designed (products, settings, stock, media: 3 each, the probe asks for at most 3).
Limits of this evidence: (1) the probe reads only, so it says nothing about who can write; (2) HTTP 200 with 0 rows would also appear if a table were simply empty. It is meaningful for `owners` and `orders`, which are known to hold rows (owner account, the live test order), so RLS is hiding them. For the other tables the empty result is consistent with RLS but not proof. Not independently reproduced by the auditor (the output was pasted by the owner).

## Update 2026-11-03 (close-out, see 28_CLOSEOUT_STATUS.md)
| ID | Domain | Where | Severity | Priority | Finding | Fix | Effort | Status |
|---|---|---|---|---|---|---|---|---|
| F-22 | SEO/Infra | Pages build | Medium | P1 | A build while Supabase answered 503 shipped a site without robots.txt, sitemap.xml, product pages and feeds (live 404 on 2026-11-03) | Retry, always write robots and a home sitemap, daily rebuild fails instead of degrading | S | FIXED IN CODE, live after next deploy |
| F-23 | Infra | Monitoring | Low | P2 | Uptime monitor does not see a database outage | GitHub 15-minute check reads one public row | XS | FIXED IN CODE, first live run after merge |
| F-12 | Infra | Backups, monitor | High | P1 | Monitor done (email only). Backups: none on Free; owner will go Pro at about 50 orders or launch | Weekly export script until then; restore test still to do | S | PARTLY OPEN |

## Incident log 2026-11-03: database password pasted into chat (I-01)
While making the first backup, the owner pasted the full database connection string, including the real database password, into the project chat and into a Terminal prompt (so also into Terminal history). No other party is known to have seen it. Treated as exposed.
Action: owner told to reset the Supabase database password straight away (letters and numbers only) and to rebuild the string without the square brackets of Supabase's template. The old password is invalid after the reset. The website uses the project API, not this password, so it should be unaffected. Status: OPEN until the owner confirms the reset. Lesson recorded in `owner-pack/05_WEEKLY_BACKUP_FREE_PLAN.md`: type the string only into Terminal with `read -rs`, never in chat; no brackets; letters and numbers only.
