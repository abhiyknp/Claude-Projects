# BUD & THINGS: India pre-launch legal checklist (2026-11-03)

**Not legal advice.** Based on the site text in the repo and general knowledge of Indian rules. Rules and rates change and some points differ by state. Your CA or a lawyer must confirm everything below. Items marked **CHECK** are uncertain.

Tags: **MUST** = required. **SHOULD** = strongly advised. **OPTIONAL**.

## 1. Policy pages and seller details

What I read: Privacy, Terms, Shipping, Refunds text in `bud-and-things/prototype/index.html` (keys `legal.*`).

| # | Item | Status | Action |
|---|---|---|---|
| 1.1 | Business name, address, GSTIN, grievance officer name and phone, court city, policy date | **MUST.** In the repo these are blank by default. Pages show "[to add]" if blank. I cannot see the live values (they live in the owner Settings database). | Open the live Privacy page. Fill every field in Settings. No "[to add]" may show. |
| 1.2 | Seller details on site (E-Commerce Rules 2020): legal name, full address, email, phone, website | **MUST.** Block exists at page bottom. Needs real data. | Use the proprietor's legal name as on PAN, plus the shop name. |
| 1.3 | Grievance officer: name, contact, 48-hour acknowledgement, 1-month redress | **MUST** (Rule 6 for sellers; Rule 4 for marketplaces). Text says 48 hours and 30 days. Good. | Add the officer's designation if you like. Can be you. |
| 1.4 | GSTIN line when not registered | Page prints "GSTIN: [to add]" if blank. | Change wording or hide the GSTIN part until registered. |
| 1.5 | Price inclusive of all taxes, shipping shown before payment | Done in text. | None. |
| 1.6 | Return, refund, exchange, delivery terms, payment modes shown | Done. Policy is "replace or refund if damaged or wrong, no change-of-mind returns". | Fine for handmade candles. CHECK with CA: refuse nothing for defective, wrong or late goods. Current text refunds if it cannot replace. |
| 1.7 | DPDP Act 2023 privacy notice | Mostly covered: what, why, who, how long, rights, withdrawal. | **I added** children and parental consent, data outside India, breach line, complaint route to the Data Protection Board (PR). |
| 1.8 | DPDP: clear consent at sign-up and checkout | **MUST.** Policy exists. I did not see a consent line at the point of data entry. | Add "I agree to the Privacy policy" near sign-in or checkout. Marketing opt-in must be separate and unticked. |
| 1.9 | DPDP: security safeguards, breach plan, delete data on request | **MUST.** Delete and download functions exist per audit. | Keep a one-page breach plan. Write down who you tell and when. |
| 1.10 | DPDP phase-in dates | CHECK. The DPDP Rules were notified in stages; some duties start later. | CA confirms what applies on launch day. Following the notice now is safe. |
| 1.11 | Data retention "8 years" | CHECK. GST law needs 72 months, Income Tax up to 8 years for some records. | CA confirms. |
| 1.12 | Dark patterns (2023 guidelines): fake urgency, hidden charges, forced sign-up | **MUST** avoid. | Re-read countdown text and coupons before launch. |
| 1.13 | Cookies | Text says no ad cookies. Code has an ads loader (`adsLoad`) that fires only if pixel IDs are set. | If you add Meta or Google pixels, update the policy and ask consent first. |

## 2. Legal Metrology (Packaged Commodities) Rules, 2011: candle label

Applies to pre-packed goods sold by quantity. Print on each pack:

1. **Name and address of maker or packer** (full address, PIN).
2. **Common or generic name** ("Scented candle", "Jesmonite tray").
3. **Net quantity**: metric units. For candles, weight in g or number of pieces. CHECK which one the Rules require for your candle type; many sellers print both (e.g. "1 candle, 170 g").
4. **Month and year of manufacture or packing.**
5. **MRP**: "MRP ₹___ (incl. of all taxes)". Never sell above MRP.
6. **Consumer care details**: name, address, phone and email of the person who handles complaints.
7. **Country of origin** if imported or if you add it (optional for local).

Also: letters must be legible and meet minimum height (depends on pack size). Online listings **MUST** show the same declarations on the product page (E-commerce amendment). Add net quantity, MRP, maker address, packing month/year and consumer care to every product page.

Other label advice (**SHOULD**, not Legal Metrology): burn time, "never leave burning unattended", wick trim, keep from children and pets, ingredients or allergen note for fragrance.

CHECK: whether small packs or a home-based packer must register with the state Legal Metrology department. Rules differ by state. Ask the CA or call your Legal Metrology controller. Product data holds weight per SKU (`grams`), so net quantity can come from there.

## 3. GST

- Threshold for goods: Rs 40 lakh a year (Rs 20 lakh in some special-category states, CHECK yours). Counted on all-India turnover for one PAN.
- **Inter-state sales:** small goods sellers under the threshold are normally exempt from registration for inter-state supply (central exemption notification). Candles are not on the excluded list. CHECK with CA.
- **Marketplaces (Amazon, Flipkart, Meesho):** the law has relief for small goods sellers on e-commerce platforms, but platforms usually ask for a GSTIN to onboard, and they collect TCS from registered sellers. So registering is likely **needed in practice** for marketplaces. Ask your CA.
- **Your own website only:** no registration under the threshold. Issue a **bill of supply**, charge **no GST** and show no GST line. Terms wording fixed (PR #99): no longer says "include GST". Bulk page now says "Invoice on every order". Once registered, add "inclusive of GST" back. CA to confirm wording.
- **When to start charging:** once turnover crosses Rs 40 lakh. Apply within 30 days of crossing. Tax is due from the date you cross. Watch the running total monthly. Set an alert at Rs 35 lakh.
- **Rate and HSN:** candles are usually HSN 3406 at 18%. Jesmonite or plaster trays need their own HSN. App defaults are 18%. CHECK both.
- Voluntary registration lets you claim input tax on supplies but adds monthly filings. Optional.
- Composition scheme is optional and not allowed for e-commerce suppliers.

## 4. Other things before the first paid order

| Item | Tag | Note |
|---|---|---|
| PAN, bank account, Razorpay KYC | **MUST. Owner says done (2026-11-03).** | Gateway asks for PAN, bank and live policy pages. |
| Shop and Establishment registration | **CHECK, state-specific. Owner says "will be done soon" (2026-11-03).** | Many states want it for any commercial place, including home-based. Some exempt very small or home units. Ask your state labour department or CA. |
| Udyam (MSME) registration | **OPTIONAL** | Free. Helps with loans and some marketplaces. Not a legal need. |
| Trade or business licence (municipal) | **CHECK, city-specific. Owner says "will be done soon" (2026-11-03).** | Often needed for making goods from a premises. Home-based low-risk units may be exempt. Ask your municipal office. |
| Candle fire and safety | **CHECK. Owner will follow the extinguisher and storage steps and ask the CA or fire office (2026-11-03).** | No central licence for small candle making. Local fire rules may apply if you store wax, fragrance oil or stock in quantity. Keep an extinguisher, store oils away from heat, keep an SDS from your fragrance supplier. |
| Pollution board consent | **CHECK** | Usually not needed for micro scale. Ask if you scale up. |
| Product liability insurance | **SHOULD** | Candles can cause fires. Get a quote. |
| BIS mark | **N/A** | No mandatory BIS standard for hand-made decorative candles to my knowledge. CHECK. |
| Trademark for BUD & THINGS | **SHOULD** | Optional. Protects the name and logo. |
| Professional tax, labour laws | Only if you hire | State-specific. |
| Records: batch, cost, safety (owner-pack templates) | **SHOULD** | Already in `audit-reports/owner-pack`. |

## 5. Open questions for the CA

1. Is GST registration needed for marketplace sales at my turnover and states?
2. Is "prices include GST" valid wording while unregistered?
3. Net quantity unit for candles, and any state registration for packers.
4. Shop and Establishment, trade licence, fire NOC for my city and state.
5. DPDP duties live at launch, and the retention period.
6. Wording of refund policy against the E-Commerce Rules.

Reuse `CA_review_pack.docx` and `email_to_CA.txt` in this folder.

## 6. Uttar Pradesh / Greater Noida West notes (web search 2026-11-03; sources are mostly consultant blogs, CONFIRM on official portals)
- **Shop and Establishment:** UP Dookan aur Vanijya Adhishthan Adhiniyam, 1962 covers Noida and Greater Noida. Sources say home-based and online businesses with a fixed place of work should register. Deadline reported as 30 days or 3 months after starting. A business run only by family members may be exempt. Amended in 2025. Register on the UP labour department portal. CHECK exact rule for a one-person home business.
- **Trade licence:** sources conflict. Some say Noida Authority issues one. One says there is no trade licence in Noida or Greater Noida. CHECK with the Authority (GNIDA) or CA.
- **Fire NOC:** UP Fire and Emergency Services Act, 2022. One vendor says a NOC is needed above 250 sq m, below that a fire extinguisher. Not official. CHECK with the UP fire service.
- **Professional tax:** one source says UP has none.
- Check the society (Amarpali Verona Heights) rules: many societies bar commercial activity or storage of stock. Ask the RWA.
