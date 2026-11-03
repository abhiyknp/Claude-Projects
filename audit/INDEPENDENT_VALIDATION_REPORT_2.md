# Independent validation, round 2 (2026-11-03)
Scope: all reports in `audit/`, re-checked against the repo. Same sandbox, same assistant team, so it is a second pass, not a separate firm. Not legal advice.

## Re-verified this pass (VERIFIED = I ran or read it now)
| Claim | Result |
|---|---|
| Secret scan | PASS, 1197 tracked files |
| Tests: import, invoice, build fallback | PASS |
| Tests: shop flow, photo fallback; page audit (13 pages, 1280 and 390 px, 2591 text items) | PASS, run against a local build |
| Pay function: signed webhook, rate limit 20 start and 120 verify per hour | STATIC, present in code |
| RLS: 25 tables, 25 with RLS on, 38 policies; only `site_text`, `settings`, `stock` are readable by anyone | STATIC, matches report 05 |
| Live site, headers, Lighthouse, probe PASS, payment test | NOT re-verified (sandbox cannot reach them; owner-reported) |

## Contradictions and unsupported claims found
1. **Report 17 says prices show "Inclusive of all taxes" (VERIFIED in app text). I cannot find that text.** No such wording exists in the site code. Only the Terms said "include GST", now removed. Status: unsupported. Fix needed: show "MRP incl. of all taxes" or "Price in INR" on product pages (see open item 4).
2. Report 17 said Udyam "Registered per owner". Owner did not state this here. Treat as unconfirmed.
3. Report 17 said Legal Metrology label content was not assessable. Now answered in `legal/label-details.md`, but labels are not yet seen by anyone. Status: draft only.
4. Own change caught: the new sign-in and checkout tick boxes broke the shop flow test (it signed in without ticking). Fixed in the same PR; test now also checks checkout stops without the tick.

## Severity check
No Critical. High items stay: F-02 (key regeneration reported by owner, cannot be checked) and F-13 (payment evidence). No rating changed.

## False positives
A-01 confirmed (sandbox network errors). A-02 stays Informational.

## Still open (what is left)
**Owner or CA actions**
1. CA review of policies, GST, labels, licences (email drafted in `legal/email_to_CA_v2.txt`).
2. Merge PR #99; check live Settings do not hold blank values that override the new defaults; read live Privacy, Terms and footer for "[to add]".
3. Shop and Establishment, trade licence, fire NOC answers for Greater Noida West.
4. Product pages: show price wording and the Legal Metrology declarations (net quantity, MRP, maker address, packing month and year, consumer care). Code change not yet made. Needs a decision on where to show it.
5. Print labels from `legal/label-details.md`; packing month and year auto-fill is not built yet.
6. Backups: first export file and restore test (F-12). Supabase Free pauses idle projects.
7. Security headers via Cloudflare (F-06/F-18, DNS change, ask first). Owner two-step (F-07). New preview code (F-08).
8. Live shop test checklist rows 1 to 16 on a normal network (F-21); Razorpay payment, webhook and refund ids as evidence (F-13).
9. Other browsers: Safari, Firefox, Edge (A-09). Screen reader and keyboard-only checkout test.
10. Product safety, cost and batch records (owner-pack templates).
11. DPDP and GST legal assumptions need CA confirmation (checklist section 5).
**Code, optional**: mobile load time (LCP about 6 s live, about 3 s local fix not yet live-tested); CSP tightening (A-05); stock-row warning (A-06); `verify` phone check (F-04).

## Missing audit coverage
Live shop, cart, checkout and owner area; TLS grade and DNS; analytics events; Instagram, Pinterest, Amazon; cross-browser; screen reader. Same as the first validation.

## Decision
**NOT READY for public launch (unchanged).** No new critical defect found. Conditions as in `28_CLOSEOUT_STATUS.md`, plus items 2 and 4 above.
