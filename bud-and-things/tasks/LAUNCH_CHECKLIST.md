# Launch checklist: what is done, and what only the owner can finish

Updated 2026-11-16. Target launch date: **20 November 2026**. Audit decision: **NOT READY** until the "On you" items 1 to 8 and the test order pass. No critical bug is known.
The Owner view → **Launch checklist** tab shows the live state of the settings items below (it reads what is saved now).
Sources: `audit/legal/TODO.md`, `audit/28_CLOSEOUT_STATUS.md`, `audit/26_MASTER_FINDINGS_REGISTER.md`. "Reported" means told to Claude and not checked by it.

## Already done (no action)
- [x] Seller and grievance details have defaults in the code (name, address, court city, grievance officer, phone). GSTIN prints nothing while empty. Any empty detail is hidden from customers; the owner sees "[to add]" and a list in the Owner view (PR #119).
- [x] Pack details on every product page (common name, net quantity, MRP, packed month and year, country of origin, maker, consumer care).
- [x] Tick boxes to agree to the terms and privacy policy at sign-in and checkout; cookie banner (only when ad IDs are set); "Download my data" and clear saved details; a breach line in the privacy policy.
- [x] PAN, bank, Razorpay KYC; live payment, webhook and refund test; backup export and restore test (all reported); uptime monitors and the GitHub site check; Cloudflare security headers.
- [x] CA question note (PDF v2), four licence enquiry letters with a tracker, and a data breach plan, all drafted on 2026-11-16.
- [x] Secret scan, 15 test suites and a sweep of every page and product page pass.

## On you, in this order
1. [ ] Open the live Privacy page: no "[to add]" anywhere. In Settings, set the **policy date** to the day you publish.
2. [ ] Settings: UPI ID and name, shop WhatsApp number, contact email, shipping and free-shipping amounts, **online payment on**, real stock counts. Watch the Launch checklist tab turn green.
3. [ ] Add your **tower and flat number** to Letter 4. Send the CA note (v2 PDF) and the four licence letters. Keep every written reply in the tracker.
4. [ ] **Shiprocket:** KYC, pickup address, wallet balance, pickup PIN in Settings, and one test courier booking with a label (live test row 13).
5. [ ] **Real product photos** (the catalogue photos are marked temporary) and the original logo files.
6. [ ] **Labels:** test print page 1 at 100% scale, check size and wording, then print all (`node bud-and-things/tools/make-labels.js out.html MM/YYYY`).
7. [ ] **One real test order**, end to end: customer email, shop email, order Paid, stock down, courier label.
8. [ ] **Breach plan:** add your backup person and your CA's name and phone.
9. [ ] **Owner two-step** on, and a new preview code (`supabase/README.md` step 7).
10. [ ] **Backups:** the weekly export routine, and the Supabase Pro decision (at about 50 orders or launch day).
11. [ ] **Last: turn off the Coming soon page** (live test row 17). Then open the home page, the catalogue and one product on a phone.

## Waiting on others (decide the risk with your CA)
- [ ] CA answers: GST (own site, other states, marketplaces), wording while unregistered, rate and HSN, Legal Metrology unit, DPDP duties and retention, refund wording.
- [ ] Replies to the four enquiries: UP Labour Department (Shop and Establishment), Greater Noida Authority (trade licence), District Fire Office, the society RWA. The society's reply matters most: many societies bar commercial activity or stock.

## Strongly advised, not mandatory
- [ ] Burn tests for every product. Do not print or publish a burn time you have not tested.
- [ ] Fragrance safety data sheet and IFRA certificate from the supplier.
- [ ] Two people with recovery access to the domain, Razorpay, Supabase and email.
- [ ] Keep your payment, webhook and refund IDs from the live test (finding F-13 evidence).
- [ ] Product safety record, cost sheet and batch records (`audit/owner-pack/templates`).

## After launch
- [ ] Raise HSTS from 1 day to 6 months after a week with no problems (Cloudflare).
- [ ] Update the policy text with the CA's answers (send them to Claude).
- [ ] Keep sales and expense records. Call the CA at ₹35 lakh turnover about GST.
- [ ] Optional: product liability insurance, trademark, stock-photo licence check, plastic packaging (EPR) question for the CA, a WhatsApp or SMS provider, product costing.
