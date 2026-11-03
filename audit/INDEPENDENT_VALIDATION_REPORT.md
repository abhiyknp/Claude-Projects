# Independent validation report
Date 2026-11-03. Scope: every report in `audit/`. No production code changed, nothing deployed, no production data read.

**Limits of this validation.** It was done by the same assistant team inside the same sandbox, so it is a second pass, not a separate firm. It re-ran checks and re-read code; it could not reach the shop data host, Razorpay, Cloudinary, DNS, port 80, or the database.

## Verified findings (re-checked this pass)
| Finding | How re-verified |
|---|---|
| Live site up, www → apex 301, 404 page, robots, sitemap | Fresh `curl` |
| Catalogue: 34 pieces, 27 in stock, 7 sold out, 0 upcoming, 0 without photo | Parsed live HTML again |
| No overflow, no missing alt, no tiny tap targets (48 views) | Playwright sweep output |
| Lighthouse accessibility 100, SEO 100, best practices 96 | 3 mobile runs, 1 desktop run |
| Mobile LCP about 6 s | 6.0, 5.9, 5.9 s |
| No secrets in repo | Pattern scan; matches were documentation only |
| RLS counts (25/25/38) | Re-counted |
| `pay` server-side amount, settle-once, signed webhook | Re-read code |
| Preview code stored as hash | Re-read code |
| Local test suites pass | Re-run |

## Rejected findings (false positives)
- **Console errors and broken catalogue images in the live sweep (T09, FE-06, A-01).** All are `ERR_TUNNEL_CONNECTION_FAILED` from the sandbox to the data host and Cloudinary. Not site defects. The first sweep summary listed them as errors; the reports now classify them as environment artefacts.

## Downgraded or re-rated
| Finding | Change | Reason |
|---|---|---|
| A-02 six H1 on `/catalogue/light/` | Low → Informational | Wizard steps, one visible at a time (appearance, not tested with a screen reader) |
| F-06/F-18 no HSTS, frame protection | Confidence High → Medium | Seen through a proxy that may alter headers; re-check from a normal network |
| Mobile performance score | single value → range 65–78 | Run-to-run variance about 13 points |
| Test totals | "12 pass" → 11 pass + 1 pass with gaps | Counting error corrected |

## Corrections to the original reports
- 08 said `pages.yml` permissions were not reviewed. They are: contents read, pages write, id-token write.
- Original findings were kept; validation notes were appended under each report.

## Newly discovered issues
1. The audit brief and the repository disagree on brand colours and payment gateway (A-08). Not a defect; the brief should be updated.
2. Stock logic: a product with no stock row shows Sold out in both shop and catalogue (A-06). By design, but an easy mistake for a new product.
3. The Owner-view product list does not warn when a live product has no stock row (suggestion).

## Unsupported or unprovable conclusions
- Owner's report of a live payment test and refund: not provable here.
- "Razorpay KYC approved", "Cashfree rejected", "PayU under discussion": taken from the brief and earlier messages, not verified.
- Brand score 80, UI/UX 75: based on two public pages.
- Legal rows: a matrix of questions, not conclusions.

## Missing coverage (not assessable)
Live shop, cart, checkout, owner area; live RLS probe; TLS grade and certificate; HTTP redirect; DNS; Safari, Firefox and Edge; screen readers and keyboard-only checkout; analytics events; Instagram, Pinterest and Amazon; product safety records; costs, margins and inventory records; backups and monitoring.

## Severity check on Critical and High
No Critical. High items are F-02 (test key shared once; test mode only, so Medium impact once regenerated) and F-13 (evidence gap for the live payment path). Both are owner actions or evidence, not code defects. Ratings kept.

## Conclusion
The decision **NOT READY** stands because evidence is missing, not because defects were found. The reports are consistent after the corrections above.
