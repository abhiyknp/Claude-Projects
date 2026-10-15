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
5. **Stop strangers from signing up.** Open Authentication, then Sign In / Providers, and turn off "Allow new users to sign up". Only the email from step 2 can edit anything in any case, but this keeps the user list clean.
6. **Connect the site.** Open Project Settings, then API. Copy the Project URL and the `anon` `public` key into `prototype/config.js`:
   ```js
   window.BT_CONFIG = { supabase: { url: 'https://abcdefghijkl.supabase.co', anonKey: 'eyJhbGciOi…' } };
   ```
   The anon key is meant to be public. The rules in `schema.sql` decide what it can do. Never put the `service_role` key in the site.
7. **Fill it.** Open the site at `#admin`, sign in, go to **Setup** and press **Copy into the database**. This saves the built-in products, rituals and current stock counts. From then on, edit everything in the Owner view.

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
| Orders | Place one; look up their own with the order number and mobile | See all, move them along |
| Reviews | Send one; it waits until Ashi publishes it | Publish, unpublish, delete |
| Sign-ups and restock requests | Send one | See, download as a spreadsheet |

When an order is placed, the database checks every price against the products table and takes the stock off in the same step (`place_order` in `schema.sql`). So a changed price is caught, and two people can never buy the last piece.

## Photos and videos

Upload them in the Owner view under **Photos & videos**. Pick the product (or "Brand" for packaging, gifting and story shots), say what each one shows, and describe it for screen readers. Photos are resized to 2000 px before upload. Videos up to 50 MB are accepted; keep loops short (6 to 10 seconds) and silent.

The site uses them as follows:

- **Pack shot:** the product card, and the first image on the product page.
- **In a room:** the second photo, shown on hover in the shop and on the home page category tiles.
- **Lit candle, Close-up detail, In the hand and short looping videos:** the product page gallery.
- **Brand photos:** the packaging section, the gifting page, the Our Story page and the home page story band.

A photo tied to one option (such as "220 g" or "Sand") shows when that option is chosen. The **Checklist** on the same tab ticks off what each product still needs, following the photo brief.

Files live in the public `media` storage bucket. Only Ashi can add, change or delete them.

## Testing without an account

`tools/mock-supabase.js` is a small in-memory stand-in that answers the same requests with the same rules:

```sh
node bud-and-things/tools/mock-supabase.js        # http://localhost:54321, owner hello@budandthings.com / demo
```

Point a local preview's `config.js` at `http://localhost:54321` (any anon key works). Everything is lost when it stops.

## Still to do before taking real money

- Connect the payment gateway (Razorpay or similar). It must confirm the payment server-side before an order counts as paid, and it should recompute the total, including the ritual saving, code, wrap and cash on delivery fee. Today `place_order` checks the item prices and stock; payments are simulated.
- Send order updates on WhatsApp or by email when an order moves along (a Supabase Edge Function or the gateway's webhooks).
- Back up: Supabase's free plan keeps daily backups for a short time only. Export orders regularly from the Table Editor, or move to a paid plan at launch.
