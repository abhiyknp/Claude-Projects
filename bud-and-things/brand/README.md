# BUD & THINGS by Ashi: brand kit v1.0

Locked 16 October 2026 from the brand identity board. Open `brand-guidelines.html` for the visual guide.

- Every SVG is a master: lettering is converted to shapes, so no fonts are needed to open or print it.
- PNGs are transparent (except backgrounds, social and favicon images) and sit in a `png/` folder next to their SVG, named `<asset>-<width>.png`.
- Colourways: `colour` (for Ivory/Sand), `colour-reverse` (for Chocolate), `chocolate`, `terracotta`, `ivory`, `gold`, `olive`, `black`, `white`.

## Palette
| Name | HEX | Role |
|---|---|---|
| Ivory | #F8F0E4 | Base |
| Sand | #EAD8C6 | Base |
| Terracotta | #A55B3F | Primary accent |
| Olive | #6B705C | Supporting |
| Sage | #9A9F85 | Supporting |
| Chocolate | #3D281E | Text / dark |
| Gold | #C9A96A | Accent, sparingly |

Type: Playfair Display (headings, logo), Montserrat (body, UI). Files and licences in `fonts/`. CSS variables, JSON and Tailwind tokens in `tokens/`.

## Folders
- `logos/` primary, primary-short (no tagline), stacked, horizontal, tagline, wordmark, wordmark-by-ashi
- `monograms/` primary-bandt (B&T), secondary-bt, encircled, minimal-b
- `icons/leaf-mark/` colour, line, solid, simplified
- `icons/supporting/` nature, ritual, home, flow, moments
- `seals/` primary and secondary, one-colour inks and sticker discs
- `patterns/` leaf, arches, terrazzo: seamless tiles and 2400 px swatches
- `usage/` logo on each brand background
- `digital/favicon/` favicon.svg, favicon.ico, Apple touch and app icons, site.webmanifest
- `digital/social/` profile pictures, link preview, Facebook, X, LinkedIn, YouTube, Instagram post and story

Website head snippet:
```html
<link rel="icon" href="/brand/digital/favicon/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/brand/digital/favicon/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/brand/digital/favicon/png/apple-touch-icon-180.png">
<link rel="manifest" href="/brand/digital/favicon/site.webmanifest">
```

Minimum sizes: primary logo 30 mm / 180 px wide, horizontal 40 mm / 160 px, wordmark 25 mm / 120 px, monograms and seals 12 mm / 48 px, simplified leaf 4 mm / 16 px. Clear space: the height of the B in BUD on every side.
