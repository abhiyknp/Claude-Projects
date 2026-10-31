# BUD & THINGS — website and app

Working notes for the BUD & THINGS ecommerce build (budandthings.com).
Design boards: https://claude.ai/artifact/SvoPbC72TMZQaFhVgGdNau
Clickable prototype: https://claude.ai/artifact/Dr85NyUq11yCmEqZkMmHkr (source: `prototype/index.html`)
Public preview: https://abhiyknp.github.io/Claude-Projects/

**How it is built, tested and published:** see [WORKFLOW.md](WORKFLOW.md) (design history, prototype structure, the Blender → browser 3D pipeline, adding a room, moods, testing, publishing, next steps).

## Decisions so far

| Area | Decision |
|---|---|
| Brand assets source | `BUD_AND_THINGS Phase 1 to Phase 3 Step 5 Master Document`: used for the logo, monogram, leaf mark, palette and packaging photos only. The launch range stays candles + Jesmonite objects |
| Visual direction | The gift-shop home page: products and gifts first. The 3D house walk-through was moved to [abhiyknp/pixelpatra](https://github.com/abhiyknp/pixelpatra/tree/main/House_3D_Prototype) in October 2026. |
| Typography | Cormorant Garamond (display) + Lato (UI), both SIL OFL |
| Founder | Brand lockup stays **BUD & THINGS**; Ashi signs the Our Story note and the footer |
| Commerce | Own website takes its own orders. **No shop platform.** Amazon, Flipkart, Meesho etc. are run from their own seller panels |
| Payments | **Razorpay**: its own checkout window for UPI, cards, net banking and wallets. Payment is confirmed by Razorpay (checked by the `pay` Edge Function and its signed webhook), never by the browser. Prepaid only: cash on delivery is off unless turned on in Settings. Setup: [supabase/README.md](supabase/README.md#online-payments-razorpay) |
| Delivery | **Shiprocket**: a real PIN code check on product pages, **Book courier** in Owner view (AWB, pickup and label in one step), and tracking that moves orders to Shipped and Delivered on its own (`delivery` Edge Function). Setup: [supabase/README.md](supabase/README.md#delivery-shiprocket) |
| Stock | One shared stock count across all channels, kept in the database and edited in the Owner view, with marketplace buffers |
| Content | Products, prices, rituals, every line of site text, settings, stock, photos and videos live in a Supabase database and are edited from the website's **Owner view** (`#admin`). Nothing day to day needs a code change. Setup: [supabase/README.md](supabase/README.md) |
| Product import | Owner view → **Import from sheet**: read the team's product sheet from an Excel file, a .csv or Google Sheet links (File → Share → Publish to web, product tab only, CSV), see a preview, then **Copy to database**. Only tabs with *Product ID / SKU*, *Product Name* and *Product Type* are read. IDs are `BNT-PRD-CODE-000` (3 digits) and become the product id (lower case); the same ID updates, never duplicates. Extra columns: *Selling price (₹)*, *Stock*, *Show on website*, optional *Short description*, *Primary image link* (https), and for marketplaces *Marketplace price (₹)* (empty means the site price), *Dimensions (cm)* (`10x10x8`, length x breadth x height) and *Barcode (EAN)* (8, 12, 13 or 14 digits with a correct last digit). A blank cell keeps what the shop already has; a value that cannot be read is ignored with a note. No price or no Yes means draft. Existing stock is only changed when ticked. Rules in `prototype/import.js`, tests: `node tools/test-import.js [workbook.xlsx]` |
| Customer accounts | Orders need a sign-in first (no guest checkout): the customer types their email and gets a 6-digit code (Supabase email sign-in, `#account`). The database refuses orders without that sign-in. Setup (email template and sender): [supabase/README.md](supabase/README.md) step 5. The preview without a database shows the code on screen. Mobile-number codes would need an SMS provider set up in Supabase |
| Coupons, rewards, invoices | Owner view → **Coupons** (many codes: % or ₹ off, smallest order, cap, dates, total and per-customer limits, first order only, a tag such as Welcome or Festive; the one marked "Show on the site" is the welcome offer the banners mention; checked and counted by the database, `check_coupon` and `place_order`). **Rewards**: points per customer, give or take back points by hand. **Invoices**: *Make invoice* on an order, numbered `BT/26-27/0001` (restarts each April, never reused), Void keeps the record, credit notes have their own series (`BTCN/26-27/0001`). The printed invoice follows the Silk · Maroon & Gold theme (maroon band, gold lettering, cream page): numbered items, amount in words, a Code 128 barcode of the invoice number, a QR to Track your order, a drawn BUD & THINGS seal under a handwritten-style signature (or your own picture: Photos & videos → Brand → Signature and seal), terms line, and a *Black and white on / off* button for printing. Helpers and tests: `prototype/invoice.js`, `node tools/test-invoice.js`. Terms and the signature name are in Settings → GST and invoices. No bank or UPI details are printed on invoices. GST is a switch in Settings → GST and invoices, off until the shop is registered: off gives a Bill of supply with no tax, on gives a Tax invoice with CGST and SGST or IGST from HSN codes and rates per category (confirm them with an accountant first). Orders can also be marked **Delayed** with a reason and a new date (a flag, not a new step), and PIN codes fill in city and state at checkout and in profiles |
| Store pages | Shop by category, new arrivals (Owner view → Settings → New arrivals), spotlight, reviews, journal (`#journal`), Why from us (`#why`), Track your order (`#track`), policy pages (`#privacy`, `#terms`, `#shipping`, `#refunds`; templates with [brackets] for the owner to complete and check), offers bar and banners, Bud Points: 5% back (setting `rewardPct`, 0 hides it), counted once an order is delivered and spent at checkout, worked out by the database. Policy business details (name, address, GSTIN, grievance officer, court city, date) are Owner view settings. Sample reviews show only in the preview without a database |
| See it in a room | Product page → See it in your room: our sample room in 3D (`prototype/room3d.js`, the real piece on an oak console in daylight or by lamplight, candle can be lit) or the visitor's own photo with a 3D render of the piece, a contact shadow and its light matched to the photo |
| Platforms | One codebase: responsive website, installable app (PWA), then Android and iOS store apps |

## Proposed stack (to confirm at Stage 4)

- **Next.js + TypeScript**: website, PWA and the shell for the store apps
- **GSAP + ScrollTrigger**: the Living Canvas only; CSS for everything else
- **Supabase** (free starter plan): products, text, settings, photos and videos, orders, stock, reviews and sign-ups. Already wired into the prototype (`prototype/db.js`, `supabase/schema.sql`)
- **Razorpay**: checkout, UPI, cards, net banking, webhooks (wired in, `supabase/functions/pay`)
- **Shiprocket**: couriers, labels, tracking (wired in, `supabase/functions/delivery`)
- **Capacitor**: wraps the same app for the Play Store and App Store
- **Vercel / Netlify / Cloudflare Pages**: hosting, free tier at launch

Recurring or per-use costs: domain, payment gateway fees per transaction, shipping per parcel,
Google Play developer account (one-time), Apple Developer Program (yearly), marketplace commissions.
Check current India pricing before committing.

## Catalogue

`data/catalogue.sheet.json`: snapshot of the team sheet (prices, weights, scent, colour, stock, Show on website). `python3 -I tools/build-shop-data.py` writes the shop's built-in products into `prototype/index.html`: only rows with Show on website = YES and a price (22 products). Photos are in `prototype/assets/catalogue/`, taken from the images in the sheet (marked temporary there); replace them with final photos before launch. The live site reads products from the database, so after a change use Owner view, Import from sheet (or Copy into the database).

Once the database is connected, the catalogue lives there and this file is only the starting point the Owner view copies in.

Product photography is still needed (the shot list is in the project's photo and video checklist). Upload it in the
Owner view under Photos & videos. Stock photos may be used as mood placeholders on the design boards only, never as
product listings.

## Brand assets

`prototype/assets/` holds images extracted from the master document PDF: the logo lockup, wordmark, B&T monogram, encircled seal and leaf mark (cut out as transparent masks so they recolour per theme), the logo photograph and the seven packaging photographs. They come from low-resolution PDF images; replace them with the original logo files and product photography before launch.

## Public preview

Every push to `main` that touches `prototype/` publishes it to GitHub Pages (`.github/workflows/pages.yml`): https://abhiyknp.github.io/Claude-Projects/ . One-time setup in the repository: Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Pinterest

- Domain verification: the `p:domain_verify` tag in the page head written by `.github/workflows/pages.yml`.
- `tools/build-pinterest.js` runs in that workflow (on each push and once a day) and adds, from the live database:
  `p/<id>/` (one address per product with its own title, picture, price and Product data, which forwards people
  to `/#p-<id>`), `pinterest/products.xml` (RSS feed for auto-publishing Pins) and `pinterest/catalog.csv`
  (data source for Pinterest Catalogs, one row per size or finish).
- The feeds list only live products with a published photo, and stay empty while the Coming soon page is on.
- To connect: Pinterest business account → Settings → Bulk create Pins → add `https://budandthings.com/pinterest/products.xml`;
  Ads → Catalogs → Data source → `https://budandthings.com/pinterest/catalog.csv` (INR, India).
- Pinterest Tag (conversion measurement) is not installed: it is an advertising script and needs a consent notice first.
