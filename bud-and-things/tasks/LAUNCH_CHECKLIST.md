# Launch checklist: what only the owner can finish

One page, in the order to do it. Sources: `audit/legal/TODO.md`, `audit/28_CLOSEOUT_STATUS.md`, `audit/26_MASTER_FINDINGS_REGISTER.md`.
Tick a box only when you've seen it work. "Reported" items below were told to me and I couldn't check them myself.

## A. This week (quick, and everything else depends on them)
- [ ] Open Privacy, Terms and the footer on the live site: no "[to add]" anywhere. If a saved blank hides a default, type the value in Settings → Policies. (live test row 16)
- [ ] Settings: UPI ID and name, shop WhatsApp number, shipping and free-shipping amounts, online payment on, GST off until registered.
- [ ] Place one real test order. Check that the customer email and the shop email both arrive. If not: Resend sender domain, `NOTIFY_TOKEN`, and the one-minute schedule (`supabase/README.md`, "Messages to customers").
- [ ] Shiprocket: KYC, pickup address, wallet balance, `pickupPin` in Settings. Book one test courier and get a label. (live test row 13)
- [ ] Owner two-step sign-in on (`supabase/README.md` step 7), and a new preview code.
- [ ] Two people with recovery access to the domain, Razorpay, Supabase and email.

## B. Send now (replies take the longest)
- [ ] CA email: fill the CA's name and the date in `audit/legal/email_to_CA_v2.txt`, attach the review pack and `INDIA_PRELAUNCH_LEGAL_CHECKLIST.md`.
- [ ] Four licence enquiries (UP labour dept, Greater Noida Authority, UP fire office, society RWA). Keep the written replies.

## C. Before going live
- [ ] Backups: first export and a weekly routine (`audit/owner-pack/05_WEEKLY_BACKUP_FREE_PLAN.md`). Supabase Pro at about 50 orders or launch day.
- [ ] Real product photos and the original logo files (the catalogue photos are marked temporary).
- [ ] Try the full order on a real phone: Safari, Firefox and Edge. Send me the phone Lighthouse result for the home page.
- [ ] Print one label at 100% scale and check size and wording (`node bud-and-things/tools/make-labels.js out.html MM/YYYY`), then print all.
- [ ] Burn test each product; fill `audit/owner-pack/templates/product_safety_record_prefilled.csv`. A qualified person judges safety. Keep photos.
- [ ] Fill the cost sheet and batch records (`cost_sheet_prefilled.csv`, `batch_record.csv`).
- [ ] Fragrance SDS and IFRA certificate from the supplier.
- [ ] Keep your payment, webhook and refund IDs from the live test (F-13 evidence).
- [ ] Decide on four wordings (see `BACKLOG.md` T-003): "less soot and a cleaner jar"; "free replacement"; the 48-hour / 30-day complaint promise; "Ships within 24 hours".

## D. Go-live day (last)
- [ ] Owner view → Settings → untick "Show visitors the Coming soon page". (live test row 17)
- [ ] Check the home page, the catalogue and one product on a phone.
- [ ] Watch the uptime email and the GitHub "Site check failed" issue for the first day.

## E. After launch
- [ ] Raise HSTS from 1 day to 6 months after a week with no problems (Cloudflare).
- [ ] Update the policy text with the CA's answers (send them to me).
- [ ] Keep sales and expense records from day one. Call the CA at ₹35 lakh turnover about GST.
- [ ] Optional: product liability insurance quote, trademark, stock-photo licence check, plastic packaging (EPR) question for the CA, a WhatsApp or SMS provider.
