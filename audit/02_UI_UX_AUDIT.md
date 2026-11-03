# 02 UI/UX audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

## What was measured
- 6 live URLs × 8 widths (360, 390, 430, 768, 1024, 1366, 1440, 1920): **no horizontal overflow**, **no images missing `alt`**, **no tap targets under 24 px** (VERIFIED, 48 page views).
- Screenshots: `audit/screenshots/live-home-390.png`, `live-home-1366.png`, `live-catalogue-390.png`, `live-catalogue-1366.png`.
- Local pre-merge audit (`tools/audit.js`): 13 pages at 1280 and 390 px, 2,577 text items, **pass** (contrast, text size, tap targets, headings, alt, names, skip link).

## Observations
| ID | Observation | Evidence | Severity |
|---|---|---|---|
| U-01 | Catalogue is clean and on-brand: dark-maroon header with gold lockup, cream background, serif headings. Sold-out pieces show a greyed photo with a "Sold out" badge. | `live-catalogue-390.png` | Info (positive) |
| U-02 | Coming soon page is on-brand: dark silk background, gold type, one clear email action. | `live-home-390.png` | Info (positive) |
| U-03 | The "See our pieces and prices" gold outline button sits below the email form (merged #89). Not visible in the first screen on a 390 px phone. | `live-home-390.png` | Low |
| U-04 | The full shop (cart, product page, checkout) could not be seen live. Only the Coming soon state is public. | NOT TESTED | n/a |
| U-05 | Cross-browser visual check: Chromium only. | NOT TESTED | n/a |

## Not assessable
Brand-wide premium feel across the shop, product photography quality (photos are marked temporary), and storytelling pages: the shop is hidden behind Coming soon and the sandbox cannot load its data. Re-test after launch.

## Independent validation note (2026-11-03)
Screenshots exist (4 files) and match the observations. U-03 stands. Brand score of 80 rests on two pages only: treat as provisional.
