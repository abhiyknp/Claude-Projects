# BUD & THINGS — website and app

Working notes for the BUD & THINGS ecommerce build (budandthings.com).
Design boards: https://claude.ai/artifact/SvoPbC72TMZQaFhVgGdNau

## Decisions so far

| Area | Decision |
|---|---|
| Visual direction | **A · Atelier of Light**: plaster arches, one moving window of light, the Living Canvas scroll from morning to dusk |
| Typography | Fraunces (display) + Hanken Grotesk (UI), both SIL OFL |
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

`data/catalogue.draft.json`: **draft** launch range of 6 candles and 6 Jesmonite objects, with
variants, prices in ₹, sizes, materials, care, discovery tags and pairings. Every name, scent and
price is a proposal for review, not a confirmed product. Burn times and wax type stay
"to be confirmed" until tested.

Product photography is still needed. Stock photos may be used as mood placeholders on the design
boards only, never as product listings.
