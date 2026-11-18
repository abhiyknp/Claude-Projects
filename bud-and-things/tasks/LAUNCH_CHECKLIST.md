# Launch checklist: what is done, and what only the owner can finish

Updated 2026-11-17. Target launch date: **20 November 2026**. Audit decision: **NOT READY** until the open "On you" items and the test order pass. No critical bug is known.
The Owner view → **Launch checklist** tab shows the live state of the settings items below (it reads what is saved now).
Sources: `audit/legal/TODO.md`, `audit/28_CLOSEOUT_STATUS.md`, `audit/26_MASTER_FINDINGS_REGISTER.md`. "Reported" means told to Claude and not checked by it.

## Already done (no action)
- [x] Seller and grievance details have defaults in the code (name, address, court city, grievance officer, phone). GSTIN prints nothing while empty. Any empty detail is hidden from customers; the owner sees "[to add]" and a list in the Owner view (PR #119).
- [x] Pack details on every product page (common name, net quantity, MRP, packed month and year, country of origin, maker, consumer care).
- [x] Tick boxes to agree to the terms and privacy policy at sign-in and checkout; cookie banner (only when ad IDs are set); "Download my data" and clear saved details; a breach line in the privacy policy.
- [x] PAN, bank, Razorpay KYC; live payment, webhook and refund test; backup export and restore test (all reported); uptime monitors and the GitHub site check; Cloudflare security headers.
- [x] Four licence enquiry letters with a tracker, a data breach plan, a task list and a work plan, all drafted on 2026-11-16 as one branded master file. The CA question note is written and kept separately; the owner decided a CA is not needed for now.
- [x] Secret scan, 15 test suites and a sweep of every page and product page pass.

## On you, in this order (owner-reported progress, 2026-11-17)
1. [x] Check the live policy pages for "[to add]"; set the policy date. **Done** (reported).
2. [x] Settings: UPI ID and name, shop WhatsApp number, contact email, shipping and free-shipping amounts, online payment on. **Done** (reported). Stock counts: check the Launch checklist tab.
3. [x] Shiprocket: KYC, pickup address, wallet balance, pickup PIN. **Done** (reported). The test label is part of item 7.
4. [ ] **Real product photos** (the catalogue photos are marked temporary) and the original logo files.
5. [ ] **Labels:** test print page 1 at 100% scale, check size and wording, then print all (`node bud-and-things/tools/make-labels.js out.html MM/YYYY`).
6. [x] **Owner two-step** is on and tested (2026-11-17, owner-reported: code scanned, SQL line run, sign-out and sign-in asked for the code). Still open: a new preview code and the first weekly backup (Supabase → Table Editor → orders → Export → CSV) (`supabase/README.md` step 7). Order matters: set `ownerTwoStep: true` in `prototype/config.js` and let the site rebuild, scan the authenticator code, and only then run `owner_two_step()` returning `true` in the SQL editor, or editing locks.
7. [ ] **One real test order**, end to end, with a courier test label: customer email, shop email, order Paid, stock down, then Book courier for a tracking number and label. Cancel the test shipment in Shiprocket afterwards (live test row 13).
8. [ ] **Last: turn off the Coming soon page** (live test row 17). **Then run the site build by hand** (GitHub → Actions → *Prototype preview (GitHub Pages)* → Run workflow): while Coming soon is on, the published home page has the Coming soon screen drawn into it so it shows fast, and the build only removes it when it sees the setting off. Without the run, visitors may see Coming soon for a moment before the shop, until the daily build. Then open the home page, the catalogue and one product on a phone.

## Skipped by the owner (decided 2026-11-17)
- The four licence enquiry letters: UP Labour Department (Shop and Establishment), Greater Noida Authority (trade licence), District Fire Office, the society RWA. The letters are written and kept separately. The risk to remember: the society can object to a home business whatever the law says.

## Strongly advised, not mandatory
- [ ] Burn tests for every product. Do not print or publish a burn time you have not tested.
- [ ] Fragrance safety data sheet and IFRA certificate from the supplier.
- [ ] Two people with recovery access to the domain, Razorpay, Supabase and email.
- [ ] Keep your payment, webhook and refund IDs from the live test (finding F-13 evidence).
- [ ] Product safety record, cost sheet and batch records (`audit/owner-pack/templates`).

## Parked for later: CA or lawyer review (not needed for now)
The policy wording, GST wording and rate, Legal Metrology unit, DPDP duties and retention, and refund wording are unreviewed. Bring in a CA before listing on a marketplace, when turnover nears ₹35 lakh, or if an office says registration is required. The question note is ready to send.

## After launch
- [ ] Raise HSTS from 1 day to 6 months after a week with no problems (Cloudflare).
- [ ] Update the policy text when you have advice or office replies (send them to Claude).
- [ ] Keep sales and expense records. Call the CA at ₹35 lakh turnover about GST.
- [ ] Optional: product liability insurance, trademark, stock-photo licence check, plastic packaging (EPR) question for the CA, a WhatsApp or SMS provider, product costing.
