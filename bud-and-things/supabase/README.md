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
5. **Stop strangers from signing up.** Open Authentication, then Sign In / Providers, and turn off "Allow new users to sign up". Leave "Confirm email" and "Secure email change" on. Only the confirmed email from step 2 can edit anything in any case, but this keeps the user list clean.
6. **Connect the site.** Open Project Settings, then API. Copy the Project URL and the `anon` `public` key into `prototype/config.js`:
   ```js
   window.BT_CONFIG = { supabase: { url: 'https://abcdefghijkl.supabase.co', anonKey: 'eyJhbGciOi…' } };
   ```
   The anon key is meant to be public. The rules in `schema.sql` decide what it can do. Never put the `service_role` key in the site.
7. **Set up the second step.** Open the site at `#admin` and sign in. The first time, the site shows a code to scan with an authenticator app on Ashi's phone (Google Authenticator, Microsoft Authenticator or 1Password); type the 6-digit code it shows. From then on, signing in needs the password and a code from the app. The database only lets a sign-in that has passed both steps change anything, so a stolen password alone can't. Do this straight after connecting the site. If the phone is lost, remove the factor under Authentication → Users → Ashi's user, then sign in again to set up the new phone.
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
| Orders | Place one; look up their own with the order number and mobile | See all, mark paid, move them along, cancel |
| Reviews | Send one; it waits until Ashi publishes it | Publish, unpublish, delete |
| Sign-ups and restock requests | Send one | See, download as a spreadsheet |

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
| Restock requests | 10 an hour per connection; once per piece per person |

To change a limit, add a row with the name in brackets as its key and a number as its value in Supabase → Table Editor → settings. Names, phone numbers, addresses, PIN codes, emails and the payment method are checked as well.

### Paid online, cash on delivery, cancelled

- **Cash on delivery** orders start as **Placed**.
- Orders paid online start as **Awaiting payment** until a payment is confirmed. Their stock is held for 2 hours (setting `payHoldMins`), then released, and the order shows as **Cancelled**. Until the payment gateway is connected, press **Mark paid** in the Owner view once you've seen the money arrive.
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

Point a local preview's `config.js` at `http://localhost:54321` (any anon key works). The second step's code is always `123456`. Everything is lost when it stops.

## Still to do before taking real money

- Connect the payment gateway (Razorpay or similar). Create the gateway's order from the database's total (the `total` column on the order), never from the browser, and let only the gateway's signed webhook (checked in a Supabase Edge Function with the secret key) move an order from Awaiting payment to Placed. Keep the gateway's secret key in Supabase's Edge Function secrets, never in `config.js` or this repository. The card form on the checkout page is a placeholder: replace it with the gateway's own checkout, so card numbers never pass through the site. Today payments are simulated.
- For cash on delivery, consider a one-time code by SMS or WhatsApp to the customer's mobile before the order is accepted (the delivery partner or an SMS service can send it); until then, the limits above keep a script from taking all the stock.
- Send order updates on WhatsApp or by email when an order moves along (a Supabase Edge Function or the gateway's webhooks).
- Back up: Supabase's free plan keeps daily backups for a short time only. Export orders regularly from the Table Editor, or move to a paid plan at launch.
