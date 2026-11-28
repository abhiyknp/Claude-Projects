# Launch checklist: what is done, and what only the owner can finish

Updated 2026-11-28 (price ladder, new products, labels and the final steps). Target launch date: **20 November 2026**. Audit decision: **NOT READY** until the open "On you" items and the test order pass. No critical bug is known.
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
5. [ ] **Labels:** test print page 1 at 100% scale, check size and wording, then print all (labels leave out burn times until real burn tests are done; `node bud-and-things/tools/make-labels.js out.html MM/YYYY`).
6. [x] **Owner two-step** is on and tested (2026-11-17, owner-reported: code scanned, SQL line run, sign-out and sign-in asked for the code). Still open: a new preview code and the first weekly backup (Supabase → Table Editor → orders → Export → CSV) (`supabase/README.md` step 7). Order matters: set `ownerTwoStep: true` in `prototype/config.js` and let the site rebuild, scan the authenticator code, and only then run `owner_two_step()` returning `true` in the SQL editor, or editing locks.
7. [ ] **One real test order**, end to end, with a courier test label: customer email, shop email, order Paid, stock down, then Book courier for a tracking number and label. Cancel the test shipment in Shiprocket afterwards (live test row 13).
8. [ ] **Last: turn off the Coming soon page** (live test row 17). **Then run the site build by hand** (GitHub → Actions → *Prototype preview (GitHub Pages)* → Run workflow): while Coming soon is on, the published home page has the Coming soon screen drawn into it so it shows fast, and the build only removes it when it sees the setting off. Without the run, visitors may see Coming soon for a moment before the shop, until the daily build. Then open the home page, the catalogue and one product on a phone.

## Prices (locked 2026-11-26)
- [x] Master sheet `data/BUD-and-THINGS_MASTER_Products-and-Prices.xlsx` locked; site, catalogue, labels, tests and the price-update SQL changed to match (PR).
- [ ] Run `supabase/apply-price-master-2026-11-26.sql` in Supabase after the PR is merged, then set shipping 79 and free over 699 in Owner view → Settings.
- [x] Stock: every option is set to 99 (`supabase/set-all-stock-99-2026-11-28.sql`) so no order is lost to Sold out. When something is really out, set its count to 0 in Owner view → Stock. Tealight counts mean packs of 6.
- [x] Paint Your Starfish is on sale at ₹249 (owner decision 28 Nov). Run `supabase/apply-price-master-2026-11-26.sql` (it now makes it live) or switch it on in Owner view.
- [ ] Run `supabase/apply-product-details-2026-11-26.sql` (order numbers, Chai and Tulip Tower prices, feelings, rooms and occasions where blank).
- [ ] Seven live products are not in the team sheet (Urli x4, Lime Glass, Daisy Candle x2): send their costs, or hide them until you have.
- [ ] Fill the yellow cells on the master's Product details sheet (burn time after a real test, package size, packed on, scent story, barcode if any), then enter them in Owner view → Products.
- [x] Christmas Tree, Teddy, Evening Ember and the three sets are live and in stock (`supabase/add-new-products-2026-11-26.sql`). Christmas Tree, Teddy and Evening Ember show their real photos until you add your own in Owner view.
- [ ] **The three sets (Float & Bloom Trio, Moulded Six, Mini Bubble Trio) show a temporary collage of real photos of the candles in them.** Replace each with a real photo of the boxed set in Owner view → Photos & videos.

## For the teams (share these)
### Testing team: burn tests
- [ ] Run a real burn test for every candle type and record the results (burn time, wick trim, how the wax melts, any soot or tunnelling). Burn times stay OFF the labels and the shop until a product has a tested number. Do not copy numbers from another brand.
- [ ] When a test is done, send the number to the owner. Then it can go in the product's Burn time field in Owner view, and on the label (`BURN_TESTED=1 node bud-and-things/tools/make-labels.js out.html`).
- [ ] Fragrance safety data sheet and IFRA certificate from the supplier (see Strongly advised).

### Print team: reprint the labels
- [ ] Reprint all labels with the locked Silk & Gold design (63.5 x 38.1 mm, one size for every product). Files: the SVG and PNG set, one file per product code; `node bud-and-things/tools/make-labels.js out.html` makes the A4 sheet.
- [ ] Test print one sheet at 100% scale on the real sticker paper first. Check the smallest text (footer and care line) at arm's length, and that the dark background prints evenly.
- [ ] Stick one label on the pouch or card of every product (not on the candle). Every price on a label must match the shop.
- [ ] The packed month is not on the label face. The product page no longer shows a Packed line unless a batch date is saved in Owner view.

## Final steps, in this order (owner)
**Second last: the real test order and the courier label**
1. [ ] On a phone, open the shop with your preview link and add one cheap product to the cart (a ₹99 candle is fine).
2. [ ] Check out with a real PIN and pay for real (UPI or card). Check: the order page shows Paid, the customer email and the shop email both arrive, and the stock count in Owner view → Stock went down by one.
3. [ ] In Owner view → Orders open the order and press **Book courier**. Check that a tracking number and a label appear. Print the label and check it reads correctly.
4. [ ] Cancel the test shipment in Shiprocket, refund the test payment in Razorpay, and put the stock count back to 99.
5. [ ] Take a first backup (the Backup card in Owner view) and remove the test order and test data.

**Last step: open the shop**
6. [ ] Owner view → Settings → turn **Coming soon** off.
7. [ ] Run the site build by hand: GitHub → Actions → *Prototype preview (GitHub Pages)* → Run workflow. Wait for it to finish (a few minutes).
8. [ ] On a phone, open the home page, the catalogue and one product page. Check the photos, the price, Add to cart and the menu.
9. [ ] A week later, with no problems: raise HSTS from 1 day to 6 months in Cloudflare.

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
