# BUD & THINGS: how the prototype is made

This is the end-to-end workflow behind the clickable prototype: how the design was arrived at, how the shop is built, how to change and test them, and how they are published. Decisions live in
[README.md](README.md); this file is the *how*.

- Live preview (public): https://abhiyknp.github.io/Claude-Projects/
- Live preview (private Claude artifact): https://claude.ai/artifact/Dr85NyUq11yCmEqZkMmHkr

---

## 1. How the design was arrived at

The brief: a premium, UX-first shop for **BUD & THINGS by Ashi** ("Thoughtful objects. Meaningful moments."), with
a "Living Canvas" opening, Find Your Feeling, Build Your Ritual, gifting, wishlist and checkout. It had to be
mobile-first and accessible, use free and open tools, never invent claims about real products, and pass approval
gates.

The work moved in stages, each reviewed before the next:

| Step | What was made | Outcome |
|---|---|---|
| Directions | Three visual directions on design boards | **Direction A** approved |
| Commerce | Own site takes orders (no shop platform), payment gateway for dynamic UPI QR, UPI app or ID and cards; marketplaces run from their own panels; one codebase for web, PWA and store apps | Agreed |
| Catalogue | The real range from the team sheet: 22 products with prices in ₹ and weights (`data/catalogue.sheet.json`) | Prices from the sheet |
| Prototype | The whole shop as a clickable prototype, with the full checkout and an owner view | Approved as the base |
| Openings A and B | 2D canvas scroll scenes: *Through the Arches*, *The Pour* | Moved to the web-intros-and-themes repository (Oct 2026) |
| Themes | Four themes: Silk · Maroon & Gold (default), Signature, Monsoon, Evening | Chosen by the owner in Owner view → Settings. Everyday, Festive and Gifting were removed from this site and are kept in abhiyknp/pixelpatra, kits/theme-kit |
| Owner-edited content | Owner view tabs: Site text (and click-to-edit on the page), Menus & FAQ, Policy pages (fill from Word or text), Journal, Filters & quiz, Home page (section order), History (undo), Owner guide | Lists are saved as JSON in the `settings` table (`navList`, `menuList`, `footList`, `faqList`, `policyPages`, `journalList`, `moodList`, `spaceList`, `occList`, `quizQ`, `homeOrder`, `homeHide`); until saved, the lists in the code show. History needs the `change_log` table: run supabase/schema.sql again. New products start as Draft and are hidden until Publish. |
| Page titles, descriptions, link preview | Every page has a title and description; the site-wide ones, tab icon and link picture are also written into the page head | Owner view → Site text → Search & sharing; logo, tab icon and link picture under Photos & videos → Brand. In the browser it shows at once; for Google and link previews it is written in by the daily site build, or run the Pages workflow by hand. |
| Brand assets | Logo, monogram, leaf mark and packaging photos cut from the master PDF | In use; replace with originals before launch |
| Opening C | A drawn first-person home tour, then a three.js 3D tour | Superseded: "looks like a cartoon"; kept in the web-intros-and-themes repository |
| Photo tour | Built from reference images | Rejected: images too small and blurry, felt like a slideshow |
| References | Oryzo (Lusion), Sleep Well Creatives, Sébastien Lempens' portfolio, Rijkscollection (with a screen recording) | One continuous camera, a product treated as the hero, calm realistic rooms, tap a piece to glide to it, a link per piece |
| **Opening D: The House** | Blender-modelled rooms with **baked light**, glide-to-piece, details panel, room list, links per piece | Foyer "exceptionally good"; bedroom and moods added |

What made the difference was **baked lighting**: sunlight patches, light bouncing off walls, soft shadows and candle
glow are pre-calculated in Blender and stored in images (lightmaps), so the browser only has to show them.

---

## 2. What is in the repository

```
bud-and-things/
  README.md                decisions, stack, catalogue and asset notes
  WORKFLOW.md              this file
  prototype/               everything the site serves (published to GitHub Pages)
    index.html             the whole shop and the Owner view: one file, no build step
    config.js              where the database is (empty = demo mode); public values only
    db.js                  the database link (window.BTDB): tables, sign-in, function calls, file uploads
    import.js, invoice.js  product-sheet import rules; invoice helpers (both have tests)
    room3d.js, products3d.js  the "See it in your room" viewer on product pages
    assets/                brand images, fonts, catalogue photos
    vendor/                three.js r160 and qrcode-generator (see vendor/VERSIONS.md)
  catalogue/               public catalogue, share, light and Diwali pages (built into /catalogue/)
  supabase/
    schema.sql             tables, access rules, limits and all database functions (safe to re-run)
    DEPLOYED_STATE.md      what must be deployed outside this repository, and who last checked it
    functions/             pay (Razorpay), delivery (Shiprocket), notify (email), _shared/util.ts
    README.md              how to set up the database and what the Owner view edits
  tools/                   build scripts (catalogue, Pinterest, CSP, script split), tests (test-*.js) and probes
  brand/, system/          logo and pattern masters; design tokens, components, icons, print and social templates
  data/catalogue.sheet.json  snapshot of the team product sheet
  tasks/                   task workspace: backlog, active and done notes
.github/workflows/         pages.yml (build and deploy), audit.yml (tests), uptime.yml (site check),
                           vendor-advisories.yml (weekly check of the vendored libraries)
```

---

## 3. The shop prototype (`prototype/index.html`)

- **One file, no build step.** HTML, CSS and a single script (an immediately-invoked function) that renders views
  into `#app`. It is published both as a Claude artifact (which adds the document shell) and on GitHub Pages
  (where the workflow adds it). So the file starts with `<title>`, not `<!doctype>`.
- **Routing** uses the URL hash: `#home`, `#shop`, `#candles`, `#jesmonite`, `#p-<id>`, `#feeling`, `#ritual`,
  `#gifting`, `#saved`, `#cart`, `#checkout`, `#order-<id>`, `#admin`, `#story`, `#help`, and
  `#house-<product id>`, which opens the house at that piece.
- **State** (cart, saved items, orders, stock, chosen mood) is kept in `localStorage` under
  `bt-proto-v2`. Every access is wrapped so the page still works when storage is unavailable. **Reset demo** in
  the top bar restores it.
- **The catalogue** starts as the `P` array in the script: variants, prices in ₹, materials, care, moods, spaces,
  occasions, scent pyramid and scent story. The moods and occasions drive Find Your Feeling and the house moods.
- **Editable content.** Products, rituals, settings (`SET_DEFAULTS`, `SET_META`), every line of copy (`TEXT`, keyed
  like `home.tag`, read with `T(key)`), stock, photos and videos come from the database when `config.js` names one
  (`loadData()`), with a cached copy for instant repeat visits. Without one, Owner view edits are kept in
  `localStorage` (`S.db`). The built-in content is the fallback, so the site never shows empty. The 3D house keeps
  its pieces even when a product is hidden (`prod()`), but only live products get labels and Add to cart.
- **The Owner view** (`#admin`) is the control panel: orders, products (every field, options and SKUs, batch,
  scent story, on or off the site), rituals, photos and videos with a checklist per product, site text, stock,
  settings, review moderation, sign-ups and restock requests (downloadable), analytics events and setup. With a
  database it asks the owner to sign in first.
- **Checkout** is simulated: contact (with a WhatsApp updates opt-in) and address validation, an optional gift
  (their name and mobile, a card note, gift wrap, an arrive-by date), a welcome code, then a dynamic UPI QR, UPI
  app, UPI ID, card (Luhn check) or cash on delivery. The free-shipping bar, ritual saving (a set % off every
  candle bought with an object) and the cart's one suggestion all read from settings. With a database, orders
  go through `place_order`, which re-checks prices and takes stock off atomically; the order page re-reads its
  status with `get_order`. Help has an order lookup by number and mobile.
- **The theme** is set in Owner view → Settings (default Silk · Maroon & Gold). The old Living Canvas opening and its
  `TOUR_ITEMS` list were removed with the 3D house (section 4).

---

## 4. The 3D house (moved out)

The 3D house walk-through (Blender rooms with baked light, the glide-to-piece tour and the room moods) was taken off
the site in October 2026. Its pipeline notes, the Blender scripts and the browser renderer now live in
[abhiyknp/pixelpatra](https://github.com/abhiyknp/pixelpatra/tree/main/House_3D_Prototype); this repository's git
history still has the version that shipped here. The sample-room viewer on product pages (`prototype/room3d.js`) is a
different feature and stays.

---

## 5. Database and Edge Functions

- `supabase/schema.sql` is the one source of truth for tables, row rules and database functions. It is written to be
  re-run safely. There are no versioned migration files: a change is made by editing `schema.sql`, pasting it into
  Supabase → SQL Editor, and noting the date in `supabase/DEPLOYED_STATE.md`.
- `supabase/functions/` holds three Edge Functions: `pay` (Razorpay), `delivery` (Shiprocket) and `notify` (email
  through Resend). They are deployed by hand with the Supabase CLI (commands in `supabase/README.md`), so what is
  running can differ from the repository. `DEPLOYED_STATE.md` is where that is recorded.
- Secrets (Razorpay, Shiprocket, Resend, the service-role key) are Supabase function secrets. They are never in the
  repository; `tools/scan-secrets.js` runs on every pull request and every push to `main`.

---

## 6. Testing

The page serves its own copy of three.js 0.160.0 from `prototype/vendor/three/` (only the files it imports), so
no third-party script runs on the site.

```sh
sh bud-and-things/tools/preview.sh &                        # http://localhost:8765/page.html
node bud-and-things/tools/mock-supabase.js &                 # optional: a test database on :54321 (see supabase/README.md)
node bud-and-things/tools/test-flow.js                       # cart → checkout → UPI → order → owner view → finder
```

- Both tests need Playwright with Chromium. WebGL runs on SwiftShader (software rendering), so the house shots
  take a few seconds each, and frame rates there say nothing about real phones.
- Check every change at **1280 px and 390 px** wide, with **no page errors** and **no sideways scrolling**.
- After publishing, open the preview on a real phone. The headless browser has no security policy and no real GPU.
  Two problems only showed up on the published page: data-URL loading, and unsupported file types.

---

## 7. Publishing

1. **Branch and PR.** Work happens on the session's own branch (named in the session). After a PR is merged, the branch
   restarts from `main` for the next change. Nothing is merged or pushed to `main` without the owner's approval. Commit messages end with the Claude attribution lines.
2. **GitHub Pages (public).** `.github/workflows/pages.yml` runs on every push to `main` that touches
   `bud-and-things/prototype/`, wraps `index.html` in a full document and deploys
   https://abhiyknp.github.io/Claude-Projects/. One-time setting: Settings → Pages → Source: **GitHub Actions**
   (done). To re-run it: Actions → *Prototype preview (GitHub Pages)* → Run workflow.
3. **Claude artifact (private).** The same `index.html` is published with its supporting files as
   https://claude.ai/artifact/Dr85NyUq11yCmEqZkMmHkr. Only the person who owns it and
   people it's shared with can open it.

---

## 8. Known limits and next steps

The live list is `tasks/BACKLOG.md`. In short:

- **Real products and photos.** Replace the temporary sheet photos and the PDF-cut brand images with originals.
- **Product costing and margins** are not built; see the backlog.
- **WhatsApp, SMS and phone push** are queued by the database but no provider is connected.
- **Store apps.** The README lists Capacitor as the plan; nothing for it exists yet.
- **Database changes** are applied by pasting `supabase/schema.sql` into the SQL editor. Record each time in
  `supabase/DEPLOYED_STATE.md`.
