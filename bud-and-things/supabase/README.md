# The shop's database

Everything on the site that changes without a code change lives in one Supabase project:

- products, prices, options and SKUs;
- the candle and object rituals;
- every line of site text, and settings such as shipping, cash on delivery, gift wrap and the welcome code;
- stock;
- photos and videos;
- orders, reviews, newsletter and WhatsApp sign-ups, and restock requests.

Ashi edits all of it from the website's **Owner view** (`#admin`). The site reads Supabase over its plain HTTP API, so there is no build step and no library to load. Until a project is connected, the site runs on its built-in draft content, and Owner view edits stay in that one browser ("demo mode").

## Set it up (about 15 minutes, once)

1. **Create the project.** Sign up at [supabase.com](https://supabase.com), then choose New project. Pick the Mumbai region, and keep the database password somewhere safe. The free plan is enough to start.
2. **Name the owner.** Open `schema.sql` in this folder. Change the email on its last line to the address Ashi will sign in with.
3. **Create the tables.** In Supabase, open SQL Editor, choose New query, paste the whole of `schema.sql` and press Run. You can run it again safely after any change.
4. **Create Ashi's login.** Open Authentication, then Users, then Add user. Enter the same email and a strong password, and tick "Auto confirm".
5. **Let customers sign in with an emailed code.** Customers must sign in before they order. Open Authentication, then Sign In / Providers, and keep "Allow new users to sign up" and the Email provider on (a customer's first code creates their account). Leave "Confirm email" and "Secure email change" on. Then open Authentication → Emails → Templates and put the code in **both** the **Confirm sign up** template (a customer's first email) and the **Magic Link** template (every later one), for example: `<h2>Your BUD & THINGS code</h2><p>Type this code on the site to sign in: <strong>{{ .Token }}</strong></p><p>It works for one hour. If you didn't ask for it, ignore this email.</p>`. Under Authentication → Emails → SMTP Settings, connect your own email sender (for example Resend, Brevo or Zoho Mail on hello@budandthings.com): Supabase's built-in sender only allows a few emails an hour and is meant for testing. Customers can never edit anything: only the confirmed email from step 2, listed in the owners table, can.
6. **Connect the site.** Open Project Settings, then API. Copy the Project URL and the `anon` `public` key into `prototype/config.js`:
   ```js
   window.BT_CONFIG = { supabase: { url: 'https://abcdefghijkl.supabase.co', anonKey: 'eyJhbGciOi…' } };
   ```
   The anon key is meant to be public. The rules in `schema.sql` decide what it can do. Never put the `service_role` key in the site.
7. **Set up the second step (after launch).** It is off until launch, so the Owner view needs only the email and password. To turn it on, change `false` to `true` in `owner_two_step()` in `schema.sql` and run it again, and set `ownerTwoStep: true` in `prototype/config.js`. Then open the site at `#admin` and sign in. The first time, the site shows a code to scan with an authenticator app on Ashi's phone (Google Authenticator, Microsoft Authenticator or 1Password); type the 6-digit code it shows. From then on, signing in needs the password and a code from the app. The database only lets a sign-in that has passed both steps change anything, so a stolen password alone can't. Do this straight after connecting the site. If the phone is lost, remove the factor under Authentication → Users → Ashi's user, then sign in again to set up the new phone.
8. **Fill it.** In the Owner view, go to **Setup** and press **Copy into the database**. This saves the built-in products, rituals and current stock counts. From then on, edit everything in the Owner view.

## Coming soon page (until launch)

While the site is connected to the database, visitors see only a Coming soon page: the logo, a short line and a sign-up form (email or WhatsApp number, saved to the sign-ups list with the source `coming-soon`). The heading and text are under Site text → Coming soon page. It is on by default, so a fresh deploy never shows the unfinished shop. Demo mode (no database) is not affected.

- **Ashi** opens `#admin` (it always works), signs in, and then sees the whole site.
- **Testers** open the preview link from Owner view → Settings → Coming soon page (`…/?preview=budpreview` by default). That browser remembers it; `?preview=off` forgets it. Changing the preview code turns off every old link.
- **Launch:** Owner view → Settings → untick "Show visitors the Coming soon page". Everyone sees the shop at once.

The preview code only keeps casual visitors out. It is not security: settings are public, so anyone who looks can find the code, and the products and prices can still be read from the database. Nothing private is behind it.

## Who can do what

| | Visitors | Ashi (signed in) |
|---|---|---|
| Products, rituals, text, settings, stock, photos | Read what is live | Read and change everything, including hidden items |
| Orders | Signed-in customers place one and see their own orders and Bud Points; anyone can look one up with the order number and mobile | See all, mark paid, move them along, cancel |
| Reviews | Send one; it waits until Ashi publishes it | Publish, unpublish, delete |
| Sign-ups and restock requests | Send one | See, download as a spreadsheet |
| Gift reminders | Save one (a date within the next year) | See what is coming up, message each customer |
| Gift cards | Check a code's balance (20 tries an hour), spend it at checkout | Issue cards, see what is left on each |
| Share links | Get their own link (5 an hour) | See which customers brought orders, send each a thank-you card |

**Bud Points.** Each order earns the setting `rewardPct` (5% by default) of what was paid for the pieces as points; 1 point is ₹1 off a later order. Points count once the order is **Delivered**. Points spent are held from the moment an order is placed and come back if it is cancelled. The database works all of this out from the customer's own orders (`points_of` and `my_orders` in `schema.sql`), so the page can't add points.

When an order is placed, the database rebuilds it from what it knows (`place_order` in `schema.sql`): every price from the products table, and the ritual saving, welcome code, shipping, gift wrap and cash on delivery fee from settings. If the total the visitor saw isn't the same, the order is refused and they're asked to check their cart. It takes the stock off in the same step, so two people can never buy the last piece.

### Limits

So a script can't flood the shop, the database counts what each visitor sends, by connection (a one-way hash of the IP address, never the address itself), by mobile number and for the whole shop:

| | Limit |
|---|---|
| Orders | 5 an hour per connection, 3 a day per mobile, 40 an hour for the whole shop (setting `maxOrdersHour`) |
| One order | up to 5 of one option (`maxQty`) and 10 pieces in all (`maxPieces`) |
| Order lookups | 20 an hour per connection |
| Reviews | 3 an hour per connection, 60 an hour in all |
| Sign-ups | 5 an hour per connection; the same email or number is only saved once |
| Gift reminders | 10 an hour per connection; the same date for the same person is saved once |
| Gift card checks | 20 an hour per connection, so codes can't be guessed |
| Restock requests | 10 an hour per connection; once per piece per person |

To change a limit, add a row with the name in brackets as its key and a number as its value in Supabase → Table Editor → settings. Names, phone numbers, addresses, PIN codes, emails and the payment method are checked as well.

### Paid online, cash on delivery, cancelled

- The shop is prepaid. **Cash on delivery** stays off unless you turn on `codOn` in Settings; its orders start as **Placed**.
- Orders paid online start as **Awaiting payment** until Cashfree confirms the payment, and then move to **Placed** on their own. Their stock is held for 2 hours (setting `payHoldMins`), then released, and the order shows as **Cancelled**. The Cashfree payment link lapses at the same time. If a payment still arrives after that, the order comes back when its pieces are still in stock. Otherwise it stays cancelled and Owner view marks it **Paid late: refund it in Cashfree**. **Mark paid** is still there for a payment you received another way.
- An order fully covered by a gift card or Bud Points needs no payment and starts as **Placed**.
- **Cancel** in the Owner view puts an order's pieces back in stock. It works until the order is shipped.
- Order numbers have a random part, such as `BT-1042-7F3A9C`, so nobody can find other people's orders by counting.

## Photos and videos

Upload them in the Owner view under **Photos & videos**. Pick the product (or "Brand" for packaging, gifting and story shots), say what each one shows, and describe it for screen readers. Photos are resized to 2000 px before upload. Videos up to 50 MB are accepted; keep loops short (6 to 10 seconds) and silent.

The site uses them as follows:

- **Pack shot:** the product card, and the first image on the product page.
- **In a room:** the second photo, shown on hover in the shop and on the home page category tiles.
- **Lit candle, Close-up detail, In the hand and short looping videos:** the product page gallery.
- **Brand photos:** the packaging section, the gifting page, the Our Story page and the home page story band.

A photo tied to one option (such as "220 g" or "Sand") shows when that option is chosen. The **Checklist** on the same tab ticks off what each product still needs, following the photo brief.

Files live in the public `media` storage bucket. Only Ashi can add, change or delete them, and it accepts only JPG, PNG and WebP photos and MP4 and WebM videos, up to 50 MB each.

## Testing without an account

`tools/mock-supabase.js` is a small in-memory stand-in that answers the same requests with the same rules:

```sh
node bud-and-things/tools/mock-supabase.js        # http://localhost:54321, owner hello@budandthings.com / demo
```

Point a local preview's `config.js` at `http://localhost:54321` (any anon key works). The second step's code is always `123456`, and a customer's emailed code is always `111111`. Everything is lost when it stops.

## Still to do before taking real money

- Set up Cashfree and Shiprocket (the two sections below). Until Cashfree is set up, the live checkout says online payment isn't switched on yet.
- For cash on delivery, consider a one-time code by SMS or WhatsApp to the customer's mobile before the order is accepted (the delivery partner or an SMS service can send it); until then, the limits above keep a script from taking all the stock.
- Set up the messages below (email first), so customers hear about their order without asking.
- Back up: Supabase's free plan keeps daily backups for a short time only. Export orders regularly from the Table Editor, or move to a paid plan at launch.


## Gift cards, reminders and share links (October 2026)

Run `schema.sql` again in the SQL Editor to add them. It is safe to re-run. Then:

- **Gift cards.** A shopper asks for a card on `#giftcard` (it opens WhatsApp or email). Once they have paid, open Owner view → Gift cards and make a card for that amount. The site generates the code (for example `BT-7KQM-3XRA`). Write it on the printed card, or send it on WhatsApp. At checkout, the code goes in the same box as the welcome code. It pays for as much of the order as its balance covers, and the balance goes down in the same step. If the order is cancelled, or never paid, the balance comes back.
- **Gift reminders.** Shoppers save a date on the Gifting page. Owner view → Sign-ups lists them with the soonest first and a Message link for each. Send one about a week before the date.
- **Share links.** On `#share`, a customer gets their own link (`?ref=ABC123`). An order placed through that link is credited to them, but never to their own number. Owner view → Gift cards lists the customers who brought orders, so you can send each one the thank-you card set in Settings → `refReward`.

## Online payments (Cashfree)

The checkout opens Cashfree's own payment window (UPI, cards, net banking and wallets), so card and bank details never pass through the site. The `pay` Edge Function (`supabase/functions/pay`) asks Cashfree for exactly the total the database worked out. It marks an order paid only when Cashfree itself reports it paid for the full amount, either straight after checkout or through Cashfree's webhook if the customer closes the page.

1. **Account.** Sign up at cashfree.com → Payment Gateway, and complete the KYC (PAN, bank account, business details and website). Until it is approved, use the **Test** mode keys.
2. **Keys.** Cashfree dashboard → Developers → API Keys: copy the **App ID** and the **Secret Key**. Keep the secret key out of this repository and out of `config.js`.
3. **Install the Supabase command line** once (`npm i -g supabase`, then `supabase login` and `supabase link --project-ref cgccziskvqyatrjqdtka` in `bud-and-things`).
4. **Secrets** (from `bud-and-things`):
   ```sh
   supabase secrets set CASHFREE_APP_ID=... CASHFREE_SECRET_KEY=... CASHFREE_ENV=sandbox \
     SITE_URL=https://budandthings.com SITE_ORIGINS="https://budandthings.com https://abhiyknp.github.io"
   ```
   Change `CASHFREE_ENV` to `production`, with the production keys, once you're ready to take real money.
5. **Deploy:** `supabase functions deploy pay --no-verify-jwt`. The function checks Cashfree's signature itself, because Cashfree can't send a Supabase sign-in.
6. **Webhook.** In the Cashfree dashboard → Developers → Webhooks, add `https://cgccziskvqyatrjqdtka.supabase.co/functions/v1/pay` for **Payment success**. In the same place, whitelist the site's domain.
7. **Try it** in test mode with Cashfree's test UPI ID or card. The order should move to **Placed** by itself.

## Delivery (Shiprocket)

The `delivery` Edge Function (`supabase/functions/delivery`) does three things:
- It checks the PIN code on product pages with real couriers.
- It books the courier from Owner view → Orders → **Book courier**. That makes the Shiprocket order, gets the AWB number, asks for a pickup and fetches the label, all in one step.
- It moves orders to **Shipped** and **Delivered** as Shiprocket tracks them. The customer's order page shows the courier, the tracking number and a tracking link.

1. **Account.** Sign up at shiprocket.in, finish the KYC, and add money to the Shiprocket wallet (couriers are paid from it).
2. **Pickup address.** Shiprocket → Settings → Pickup addresses: add the studio and note its name (often `Primary`).
3. **API user.** Shiprocket → Settings → API → Configure → **Create an API user**, with a separate email and password. This is not your own login.
4. **Settings in Owner view:** `pickupPin` (the studio's PIN code, which also turns on the live PIN check), `shiprocketPickup` (the pickup name from step 2), and your usual box: `parcelKg`, `parcelL`, `parcelB` and `parcelH`.
5. **Secrets and deploy:**
   ```sh
   supabase secrets set SHIPROCKET_EMAIL=... SHIPROCKET_PASSWORD=... SHIPROCKET_WEBHOOK_TOKEN=<any long random text>
   supabase functions deploy delivery --no-verify-jwt
   ```
6. **Tracking webhook.** Shiprocket → Settings → API → Webhooks: URL `https://cgccziskvqyatrjqdtka.supabase.co/functions/v1/delivery`, with the token from step 5.
7. **Each day:** in Owner view → Orders, press **Book courier** on each paid order, print the label, and hand the parcels over at pickup.

Testing without accounts: `tools/mock-supabase.js` stands in for both functions. A payment goes through at once, every PIN is reachable, and booking gives a made-up AWB.

## Customer profiles (October 2026)

Run `schema.sql` again. Signed-in customers get **Your details** on their account page: name, mobile, up to 5 saved addresses (one is the usual) and how they want to be reached. Checkout starts from these (name, mobile, and the usual address unless the order is a gift), and every order adds its address to the profile. "Clear my saved details" empties the profile and keeps past orders. A customer can only read and change their own profile (`my_profile`, `save_profile`, `forget_me`); Ashi can read all of them in the `profiles` table.

## Messages to customers (October 2026)

The database queues a message when something happens (the `notifications` table, readable in Supabase → Table Editor); the `notify` Edge Function sends what is queued, once each.

| Happening | Customer | Ashi |
|---|---|---|
| First sign-in (welcome) | email | |
| Order placed and paid, or cash on delivery | email, WhatsApp/SMS if chosen | email: new order |
| Shipped, Delivered, Cancelled | email, WhatsApp/SMS if chosen | |
| Payment arrived after the order was released | email: refund coming | email: refund needed |
| A piece they asked about is back in stock | email or WhatsApp/SMS (whichever they left) | |
| Gift date coming up (`reminderDays`, 7 by default) | email or WhatsApp/SMS | |

Sign-in codes stay with Supabase's own email. Email always works. WhatsApp, SMS and phone notifications only go to customers who ticked them (account page, or the WhatsApp tick at checkout), and only once Ashi switches the channel on in Owner view → Settings (`whatsappOn`, `smsOn`, `pushOn`). New orders go to `orderAlerts` (the contact email when empty).

**Email (Resend), about 10 minutes:**
1. Resend → API Keys → create one. The domain budandthings.com is already set up there for sign-in codes.
2. Secrets and deploy, from `bud-and-things`:
   ```sh
   supabase secrets set RESEND_API_KEY=... NOTIFY_TOKEN=<any long random text> SITE_URL=https://budandthings.com
   supabase functions deploy notify --no-verify-jwt
   ```
   Optional: `NOTIFY_FROM="BUD & THINGS <hello@budandthings.com>"` (defaults to the contact email).
3. **Schedule it.** In Supabase → Database → Extensions turn on `pg_cron` and `pg_net`, then run this in the SQL Editor with your own token (keep this query out of the repository):
   ```sql
   select cron.schedule('bt-notify', '* * * * *', $$select net.http_post('https://cgccziskvqyatrjqdtka.supabase.co/functions/v1/notify', '{"action":"run"}'::jsonb, headers := '{"Content-Type":"application/json","x-notify-token":"YOUR_TOKEN"}'::jsonb)$$);
   select cron.schedule('bt-notify-daily', '30 3 * * *', $$select net.http_post('https://cgccziskvqyatrjqdtka.supabase.co/functions/v1/notify', '{"action":"daily"}'::jsonb, headers := '{"Content-Type":"application/json","x-notify-token":"YOUR_TOKEN"}'::jsonb)$$);
   ```
   The second one queues gift reminders at 9:00 am India time. A failed send is retried up to 5 times; what still fails shows as `failed`, with its error, in the `notifications` table.

**WhatsApp, SMS and phone push (later).** Each needs a provider account that Ashi must open, and `notify` calls a small adapter URL for it (`WHATSAPP_URL`, `SMS_URL`, `PUSH_URL`, with `PROVIDER_TOKEN`; it receives `{channel, to, text, event, order_id, subject}`):
- *WhatsApp:* a WhatsApp Business API account (through Gupshup, Interakt, Wati or Meta directly). Every business-started message needs a template approved by WhatsApp, which takes a day or two.
- *SMS:* in India, SMS needs DLT registration (business entity, sender ID and each template) with the operator, then a sender such as MSG91 or Twilio. It takes about a week, so start early if wanted.
- *Push:* there is no mobile app yet. Web push (browser notifications) needs a service worker and the site installed on the phone, and suits orders least; real app push can come with the app.


## Coupons, points, invoices and delayed orders

Run `schema.sql` again in the SQL editor (it is safe to repeat): it adds the `coupons`, `points_log`, `invoices` and `invoice_counters` tables, moves the old welcome code into the first coupon (HELLO10 or whatever Settings had), and adds `check_coupon`, `issue_invoice`, `void_invoice` and `set_delay`. Then redeploy the `notify` function so the "running late" email can be sent. Nothing else changes.

## Sign-ups, Analytics and Reviews (October 2026)

Run `schema.sql` again in the SQL Editor to add them. It is safe to re-run.

- **Sign-ups → Customers.** One row per person, joined by email and mobile from orders, saved accounts, sign-ups, gift dates, restock requests and share links. Search, filter by group, source or city, download as a spreadsheet. Open a customer for orders, addresses, consent, gift dates, timeline, tags, a private note and a birthday. "Delete their details" removes everything except orders and invoices.
- **Analytics.** Visits are now saved to the `events` table (anonymous: a random id per browser and per visit, no names or numbers). Add `?utm_source=instagram` to shared links to count sources. Settings has a monthly goal and the Monday email. Events older than `eventDays` (400) are cleared.
- **Reviews.** Waiting / Published tabs, star and piece filters, bulk actions, replies, Featured (shown first on the home page), reviews added by hand, a Verified buyer tick for signed-in customers who received the piece, one review per piece per customer, email alerts for 1 and 2 stars, a review request email `reviewAskDays` after delivery, and `reviewPoints` Bud Points for published reviews. Product pages carry star markup for Google.
- **WhatsApp.** A 10-digit number in Settings gets `91` added. Real WhatsApp alerts still need a Business API provider (not connected yet).
- **Site text.** About 30 more labels (festive banner, offer banners, house walk labels, home links) are now editable. The festive banner has an on/off switch in Settings.

## Mobile numbers (October 2026)

Every mobile number is saved as `+91` and the 10 digits, such as `+919876543210`, in orders, saved accounts, gift recipients, sign-ups, restock requests, gift reminders and share links. Forms show a fixed "+91" beside a 10-digit box; `9876543210`, `919876543210`, `09876543210` and `+91 98765 43210` are all accepted and saved the same way. The database does the conversion (`norm_phone()` in `schema.sql`), so it holds whatever the page sends. Run `schema.sql` again to convert numbers saved earlier. Exports and the Customers list show the `+91` form, ready for WhatsApp providers and spreadsheets. Cashfree and Shiprocket still receive the plain 10 digits they expect.
