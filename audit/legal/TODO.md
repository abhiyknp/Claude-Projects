# BUD & THINGS launch to-do (updated 2026-11-03)
Not legal advice. CA confirms legal items. Done items are in PRs #99, #104 and the PR after.

## Owner, next (tomorrow)
- [ ] **CA email:** fill CA name and date in `legal/email_to_CA_v2.txt`, attach `CA_review_pack.docx` and `INDIA_PRELAUNCH_LEGAL_CHECKLIST.md`, send.
- [ ] **Licence enquiries:** send the four drafts in checklist section 7 (UP labour dept, Greater Noida Authority, UP fire office, society RWA). Keep written replies.
- [ ] **Label print check:** print page 1 of `legal/labels.pdf` at 100% scale on paper, check size and wording, then print all. Re-make with `node tools/make-labels.js out.html MM/YYYY`.
- [ ] **Live Settings check:** open Privacy, Terms and footer on the live site. No "[to add]". If a saved blank overrides defaults, type the values in Settings, Policies.
- [ ] **Photos check:** after deploy, one product page: photos load (tighter image policy).
- [ ] **Backups:** first export and a restore test; plan to move to Supabase Pro at about 50 orders or launch day.
- [ ] **Owner two-step** on (F-07). New preview code (F-08).
- [ ] **Live shop test** checklist rows 1 to 16 (`owner-pack/03`), on a normal network. Keep payment, webhook and refund ids (F-13).
- [ ] **Real burn tests** per product; fill `owner-pack/templates/product_safety_record_prefilled.csv`. Keep photos. A qualified person judges safety.
- [ ] **Cost sheet:** fill `cost_sheet_prefilled.csv`. Batch records: `batch_record.csv`.
- [ ] **Phone Lighthouse result** for the live home page, then I fix mobile load time (LCP about 6 s).
- [ ] **Other browsers:** Safari, Firefox, Edge, and a screen reader on checkout (A-09).

## Owner, soon
- [ ] Fragrance SDS and IFRA certificate from the supplier.
- [ ] Trademark for BUD & THINGS (optional, advised).
- [ ] Licence check for stock photos and videos.
- [ ] Plastic packaging (EPR): ask the CA.
- [ ] WhatsApp and SMS marketing: opt-in only; SMS needs DLT registration.
- [ ] Courier (Shiprocket) KYC and pickup address; society allows pickups.
- [ ] Two people with recovery access to domain, Razorpay, Supabase, email.
- [ ] Keep sales and expense records from day one.
- [ ] Product liability insurance quote.
- [ ] Watch turnover monthly; at Rs 35 lakh call the CA about GST.
- [ ] Cloudflare security headers: owner-reported progress, retest with `curl -I https://budandthings.com/`.

## Waiting on CA answers
GST for marketplaces and inter-state; wording while unregistered; candle net quantity unit and packer registration; Shop and Establishment, trade licence, fire NOC; DPDP duties and retention; refund policy wording.

## Claude can do next (say yes)
- [ ] Mobile load time fix (needs the Lighthouse result).
- [ ] Re-run the independent audit after CA replies and owner steps.
- [ ] Update policies and Pack details after CA answers.
- [ ] Remaining marketing text review beyond the scan done now (no risky claims found; one soft line: "less soot and a cleaner jar").

## Done
- [x] Policies: DPDP additions, GST wording, defaults for business and grievance details (#99)
- [x] Tick boxes at sign-in and checkout (#99)
- [x] Pack details on product pages (#99); country of origin and contact block (this PR)
- [x] Label generator and PDF; prefilled safety and cost sheets (#99)
- [x] CSP image tightening, stock-row warning, "Packed on" date (#104)
- [x] Audit validation round 2, brief facts corrected
- [x] PAN, bank, Razorpay KYC (owner)
