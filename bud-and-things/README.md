# BUD & THINGS — website and app

Working notes for the BUD & THINGS ecommerce build (budandthings.com).
Design boards: https://claude.ai/artifact/SvoPbC72TMZQaFhVgGdNau
Clickable prototype: https://claude.ai/artifact/Dr85NyUq11yCmEqZkMmHkr (source: `prototype/index.html`)

## Decisions so far

| Area | Decision |
|---|---|
| Brand assets source | `BUD_AND_THINGS Phase 1 to Phase 3 Step 5 Master Document`: used for the logo, monogram, leaf mark, palette and packaging photos only. The launch range stays candles + Jesmonite objects |
| Visual direction | Default opening **D · The House** (`prototype/house3d.js`): a porch, foyer and bedroom modelled and lit in Blender (`3d/foyer.py`, `3d/bedroom.py`, shared `3d/houselib.py`), with daylight (dusk in the bedroom) and candle light baked into lightmaps and mixed as the candles light. Scroll walks in through the carved door, past the candle niche and both shelves, through the arch into the bedroom. Tapping a piece glides the camera to it (details, Light it, Add to cart, Share); `#house-<product>` links open the house at that piece. **Set the mood** dresses the house for a feeling (calm, cosy, fresh, creative) or a gift (birthday, housewarming, festive, thank you): colours, light, extras such as marigolds and diyas, labels on pieces that suit it, and the matching site theme. Openings C, A, B and six themes stay switchable |
| Typography | Cormorant Garamond (display) + Lato (UI), both SIL OFL |
| Founder | Brand lockup stays **BUD & THINGS**; Ashi signs the Our Story note and the footer |
| Commerce | Own website takes its own orders. **No shop platform.** Amazon, Flipkart, Meesho etc. are run from their own seller panels |
| Payments | Payment gateway (Razorpay or similar): dynamic UPI QR on screen, UPI app / UPI ID, cards. Payment confirmed automatically by the gateway |
| Stock | One shared stock count across all channels (a Google Sheet at launch), marketplace buffers |
| Platforms | One codebase: responsive website, installable app (PWA), then Android and iOS store apps |

## Proposed stack (to confirm at Stage 4)

- **Next.js + TypeScript**: website, PWA and the shell for the store apps
- **GSAP + ScrollTrigger**: the Living Canvas only; CSS for everything else
- **Supabase** (free starter plan): orders, stock, owner dashboard
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

Product photography is still needed. Stock photos may be used as mood placeholders on the design
boards only, never as product listings.

## Brand assets

`prototype/assets/` holds images extracted from the master document PDF: the logo lockup, wordmark, B&T monogram, encircled seal and leaf mark (cut out as transparent masks so they recolour per theme), the logo photograph and the seven packaging photographs. They come from low-resolution PDF images; replace them with the original logo files and product photography before launch.
