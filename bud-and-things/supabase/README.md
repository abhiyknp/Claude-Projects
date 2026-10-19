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
- Send order updates on WhatsApp or by email when an order moves along (a Supabase Edge Function or the gateway's webhooks).
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
