# After launch: the five jobs

No passwords, keys or personal details belong in this file.

## 1. Weekly backup (Owner, 2 minutes)
Owner view, Start tab, **Download full backup** (everything, one file) and **Orders as a spreadsheet**. Do it once now, then every week. Move the files to your own private Drive (2-step sign-in on). Never email them or put them in the repository. The Start tab tells you how many days since the last one.
Fallback if the button fails: Supabase, Table Editor, `orders`, Export, CSV.

## 2. Burn tests and tested burn times (Team)
Until a product has a tested burn time the product page says "Burn time to be confirmed by testing". Only publish a time you measured.
Procedure, per candle size:
1. Weigh the candle without lid. Trim wick to 5 mm. Room: no draught, flat surface.
2. Light it. Note start time. Burn in sessions of 3 to 4 hours (never longer), cool and re-trim between sessions.
3. Stop when about 1 cm of wax is left. Note total burn hours.
4. Do it for 2 candles of each size. Publish the lower number, rounded down to 5 hours.
5. Record in the log below, then enter it in Owner view, product details.

| Date | Product code | Size | Wick | Candle 1 hours | Candle 2 hours | Published hours | Notes (soot, tunnelling, flame height) |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## 3. Fragrance safety sheet and IFRA certificate (Team, ask the supplier)
Draft message to each fragrance and wax supplier:

> Hello, we make scented candles and sell them in India. For each fragrance oil and wax we buy from you, please send: (1) the current Safety Data Sheet (SDS), (2) the IFRA certificate showing the category for candles and the maximum permitted percentage, and (3) the batch or lot number we should record. Please also confirm the product codes the documents cover. Thank you.

Keep the files in a private shared folder. Match every product's fragrance load to the IFRA maximum. Do not publish safety or allergen claims that are not on the documents.

## 4. A second person with recovery access (Owner, first week)
Pick one trusted person. For each account below, add them as a user or recovery contact where the service allows it, and store recovery codes in a password manager that both can open. Tick when done.
- [ ] Domain registrar (budandthings.com)
- [ ] Cloudflare
- [ ] GitHub repository
- [ ] Supabase project
- [ ] Razorpay
- [ ] Shiprocket
- [ ] Email sending service (Resend) and shop mailbox
- [ ] The authenticator: set up on a second device or save the Supabase recovery codes

## 5. Redeploy `pay` and `delivery` (anyone, no computer)
One-time: in Supabase, Account, Access Tokens, generate a token. In GitHub, repository Settings, Secrets and variables, Actions, add a secret named `SUPABASE_ACCESS_TOKEN`.
Then: GitHub, Actions tab, **Deploy shop functions (manual)**, Run workflow, choose **pay and delivery**. Green means done. Update `supabase/DEPLOYED_STATE.md` with the date.
The courier-lookup index (`orders_awb`) is still a separate step: run its line from `supabase/` in the Supabase SQL editor.

## 6. Raise HSTS after a quiet week (Owner, about Fri 27 Nov)
If the site has had no certificate or "not secure" problems for a week:
Cloudflare, the budandthings.com site, SSL/TLS, Edge Certificates, HTTP Strict Transport Security (HSTS), Change HSTS settings: max age **6 months**, keep "Include subdomains" off and "Preload" off. Open the site in a private window afterwards to confirm it loads.
