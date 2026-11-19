# BUD & THINGS by Ashi: social media kit

Everything for Instagram, YouTube Shorts, WhatsApp and Pinterest from launch (Fri 20 Nov 2026) to New Year. Nothing here touches the website.

| File | What it is |
|---|---|
| [STUDY.md](STUDY.md) | Full study of the business from the whole repo: readiness, catalogue numbers, shipping problem, positioning, SWOT |
| [ACCOUNT_SETUP.md](ACCOUNT_SETUP.md) | Build the Instagram account from zero: name, bio, link, settings, Highlights |
| [ROLLOUT.md](ROLLOUT.md) | **Start here.** Day-by-day first 14 days, the first 9 posts, daily engagement routine, first-100 targets |
| [OUTREACH.md](OUTREACH.md) | Ready-to-send messages: friends, creators, businesses, offices; saved replies |
| [SHOOT_BRIEF.md](SHOOT_BRIEF.md) | **Send to the team:** exactly which photos and clips are needed, specs and file names |
| [PRICING_UPDATE.md](PRICING_UPDATE.md) | What to re-check when the new prices and shipping arrive |
| `account-assets/` | Profile picture and 7 Highlight covers, ready to upload |
| [STRATEGY.md](STRATEGY.md) | Who it's for, 4 pillars, tone, honest-marketing rules, platform split, open questions |
| [CALENDAR.md](CALENDAR.md) | Day by day, 14 Nov to 31 Dec: what to post, hook, caption ID, what to prepare |
| [reels/](reels/) | 10 Reel scripts (hook, shot list, on-screen text, audio mood, CTA) |
| [captions/](captions/) | `instagram.md` (ready to paste), `stories-status.md`, `youtube-pinterest.md`, `hashtags.md` |
| [templates/](templates/) | 6 on-brand graphics (4 posts at 1080x1350, 2 Stories at 1080x1920) and the PNG exporter |
| `brand.json` | Handle, site address, show or hide prices |
| `photos/` | **Your** product photos go here |
| `check.js` | A checker for limits, banned claims, prices and missing captions |

## Your week in 30 minutes (do it on Sunday)

| Min | Do this |
|---|---|
| 5 | **Facts.** Open the Owner view. Note which products are in stock, any price changes, whether the welcome code is live, the shipping fee and free-shipping amount. Anything at 0: do not feature it. |
| 3 | **Plan.** Open `CALENDAR.md` and find next Mon to Sat. Check the "Asset needed" column. |
| 10 | **Graphics.** Put your photos in `photos/`. In `templates/posts.json`, add or edit one entry per graphic (product id, kicker, photo file). Run `node social/templates/export.js`. PNGs appear in `out/`. |
| 7 | **Schedule.** Paste each caption from `captions/instagram.md` into Meta Business Suite (feed, Reels, Stories can all be scheduled) and YouTube Studio (Shorts). Add the offer line only if the code is live. |
| 3 | **Check.** Run `node social/check.js`. It should say "All checks passed." |
| 2 | **Pins.** Save the week's carousel images to Pinterest with the lines in `captions/youtube-pinterest.md` (once a week, Sunday). |

**What's not in the 30 minutes** (be honest with yourself about it):
- **Filming.** Film while you work, in 2- to 5-minute bursts: the pour, the Jesmonite mix, the wrapping. Aim to get 2 Reels' footage on each pour day. The scripts in `reels/` tell you the shots.
- **Daily, about 10 minutes:** post the Stories and WhatsApp Status for the day (`captions/stories-status.md` has the lines), and reply to DMs and comments. Replying is the best marketing you have.

## Making the graphics

```bash
cd bud-and-things/social
node templates/export.js                  # all graphics in templates/posts.json -> out/
node templates/export.js --only p01-product,s02-poll
node templates/export.js --guides         # shows Story safe zones (blue) and the sticker slot, for checking
node templates/export.js --final          # refuses to export if any picture is a temporary catalogue image
```

Needs Node and Playwright (`npm i -D playwright`, then `npx playwright install chromium` if the browser is not already there). The output is exactly 1080x1350 or 1080x1920.

| Template | Size | Use it for | Fields in `posts.json` |
|---|---|---|---|
| `01-post-product` | 1080x1350 | One product, with name, scent, price | `product`, `kicker`, `badge` (optional), `photo` |
| `02-post-quote` | 1080x1350 | Tips, care, greetings, carousel covers | `kicker`, `title`, `sub` |
| `03-post-list` | 1080x1350 | Gift guides, price ladders | `kicker`, `title`, `items[]` (each: `product`) |
| `04-post-announce` | 1080x1350 | Launch, announcements | `kicker`, `title`, `sub` |
| `05-story-product` | 1080x1920 | Product Story with a link sticker | `product`, `kicker`, `badge`, `photo` |
| `06-story-interactive` | 1080x1920 | Polls, questions, countdowns | `kicker`, `title`, `sub` |

- Product name, price, type and scent are read from the catalogue, so they cannot drift from the site. Wrap words in `*stars*` to make them gold italic.
- Set `"price": false` on an entry, or `"showPrices": false` in `brand.json`, to hide prices.
- The templates use the site's own logo files (`prototype/assets/logo-primary-reverse.webp` on maroon, `logo-primary.webp` on cream) and fonts (Playfair Display, Montserrat). Nothing is copied or edited.

### About the product pictures (please read)

The site's catalogue pictures are marked **temporary** in the main README, and several look like rendered images rather than photographs of the actual pieces. They are fine for checking layouts. **Do not post them as photos of what you ship**: showing something different from what the customer receives can be a misleading advertisement. Take your own photos (natural window light, plain background) and save them in `photos/` as, for example, `vanilla-gold.jpg`, then set `"photo": "vanilla-gold.jpg"` in `posts.json`. The exporter lists any temporary picture it used, and `--final` blocks it.

## Before you post, every time

1. Is every product I named in stock *today*?
2. Are the prices and shipping the ones on the site now?
3. Is the offer (HELLO10) live? If not, I left the line out.
4. Is it my own photo or footage? Is a person visible who has not said yes?
5. Does it say anything I cannot prove (natural, non-toxic, burn time, "relaxing")? If so, delete it.
6. If a customer is shown, did they say yes in writing (a DM counts)?
7. If a product was gifted to someone for a post, is it labelled (#gifted, Paid partnership)?
8. Is every date in it true (opening day, festivals)? Never post a delivery or order-by date you have not checked with the courier.
9. Is there a phone number, address or private detail in the frame or caption? Remove it.

## Open questions

See the last section of [STRATEGY.md](STRATEGY.md): the Instagram handle spelling, whether to show prices, two product names that look like typos, courier dates for Christmas, and the gift box.

## Site fix (not done: no site changes before launch)

The website's footer link to Instagram is fixed in `prototype/index.html` as `https://www.instagram.com/budandthings_offical/` (misspelled: **offical**). The real handle is `budandthings_official`. Until fixed, visitors from the site land on the wrong page. Quick fix: in the Owner view, Settings, set Instagram to `budandthings_official` (the footer social icons use that setting). The fixed link in the pay section needs a one-word code change after launch; tell me when you want it done.
