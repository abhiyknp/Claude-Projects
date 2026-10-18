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
| Visual direction | Default opening **D · The House** (`prototype/house3d.js`): a porch, foyer and bedroom modelled and lit in Blender (`3d/foyer.py`, `3d/bedroom.py`, shared `3d/houselib.py`), with daylight (dusk in the bedroom) and candle light baked into lightmaps and mixed as the candles light. Scroll walks in through the carved door, past the candle niche and straight through the arch into the bedroom (the foyer shelf pieces stay a tap or **Shop this room** away). Tapping a piece glides the camera to it (details, Light it, Add to cart, Share); `#house-<product>` links open the house at that piece. **Set the mood** dresses the house for a feeling (calm, cosy, fresh, creative) or a gift (birthday, housewarming, festive, thank you): colours, light, extras such as marigolds and diyas, labels on pieces that suit it, and the matching site theme. The owner picks the site theme (six) in Owner view → Settings. The earlier openings A, B and C and a copy of the themes moved to the web-intros-and-themes repository |
| Typography | Cormorant Garamond (display) + Lato (UI), both SIL OFL |
| Founder | Brand lockup stays **BUD & THINGS**; Ashi signs the Our Story note and the footer |
| Commerce | Own website takes its own orders. **No shop platform.** Amazon, Flipkart, Meesho etc. are run from their own seller panels |
| Payments | Payment gateway (Razorpay or similar): dynamic UPI QR on screen, UPI app / UPI ID, cards. Payment confirmed automatically by the gateway |
| Stock | One shared stock count across all channels, kept in the database and edited in the Owner view, with marketplace buffers |
| Content | Products, prices, rituals, every line of site text, settings, stock, photos and videos live in a Supabase database and are edited from the website's **Owner view** (`#admin`). Nothing day to day needs a code change. Setup: [supabase/README.md](supabase/README.md) |
| Platforms | One codebase: responsive website, installable app (PWA), then Android and iOS store apps |

## Proposed stack (to confirm at Stage 4)

- **Next.js + TypeScript**: website, PWA and the shell for the store apps
- **GSAP + ScrollTrigger**: the Living Canvas only; CSS for everything else
- **Supabase** (free starter plan): products, text, settings, photos and videos, orders, stock, reviews and sign-ups. Already wired into the prototype (`prototype/db.js`, `supabase/schema.sql`)
- **Razorpay** (or similar): checkout, dynamic UPI QR, cards, webhooks
- **Capacitor**: wraps the same app for the Play Store and App Store
- **Vercel / Netlify / Cloudflare Pages**: hosting, free tier at launch

Recurring or per-use costs: domain, payment gateway fees per transaction, shipping per parcel,
Google Play developer account (one-time), Apple Developer Program (yearly), marketplace commissions.
Check current India pricing before committing.

## Catalogue

`data/catalogue.draft.json`: draft launch range of 6 candles and 6 Jesmonite objects, with
variants, prices in ₹, sizes, materials, care, discovery tags and pairings. Every name, scent and
price is a proposal for review, not a confirmed product. Burn times and wax type stay
"to be confirmed" until tested.

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
