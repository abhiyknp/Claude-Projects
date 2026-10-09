# BUD & THINGS: how the prototype is made

This is the end-to-end workflow behind the clickable prototype: how the design was arrived at, how the shop and the
3D house are built, how to change and test them, and how they are published. Decisions live in
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
| Catalogue | A draft range of 6 candles and 6 Jesmonite objects (`data/catalogue.draft.json`), every name and price marked as a proposal | Agreed as a draft |
| Prototype | The whole shop as a clickable prototype, with the full checkout and an owner view | Approved as the base |
| Openings A and B | 2D canvas scroll scenes: *Through the Arches*, *The Pour* | Kept as alternatives |
| Themes | Six themes, made bolder after "too pastel" | Kept |
| Brand assets | Logo, monogram, leaf mark and packaging photos cut from the master PDF | In use; replace with originals before launch |
| Opening C | A drawn first-person home tour, then a three.js 3D tour | Superseded: "looks like a cartoon" |
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
  data/catalogue.draft.json
  3d/
    houselib.py            shared Blender helpers: shapes, UVs, baking, panorama, export
    foyer.py               porch + foyer (Blender script)
    bedroom.py             bedroom (Blender script)
  prototype/               everything the site serves
    index.html             the whole shop: one file, no build step
    house3d.js             opening D, the house (three.js)
    products3d.js          3D models of the products, shared by C and D
    tour3d.js              opening C, the earlier 3D tour
    assets/                brand images, oak texture
    assets/house/          baked rooms: geometry modules, lightmaps, reflection panoramas
  tools/
    preview.sh             local preview server
    test-flow.js           end-to-end shop test
    test-house.js          screenshots of the house walk
.github/workflows/pages.yml  publishes prototype/ to GitHub Pages
```

---

## 3. The shop prototype (`prototype/index.html`)

- **One file, no build step.** HTML, CSS and a single script (an immediately-invoked function) that renders views
  into `#app`. It is published both as a Claude artifact (which adds the document shell) and on GitHub Pages
  (where the workflow adds it). So the file starts with `<title>`, not `<!doctype>`.
- **Routing** uses the URL hash: `#home`, `#shop`, `#candles`, `#jesmonite`, `#p-<id>`, `#feeling`, `#ritual`,
  `#gifting`, `#saved`, `#cart`, `#checkout`, `#order-<id>`, `#admin`, `#story`, `#help`, and
  `#house-<product id>`, which opens the house at that piece.
- **State** (cart, saved items, orders, stock, chosen opening, theme and mood) is kept in `localStorage` under
  `bt-proto-v2`. Every access is wrapped so the page still works when storage is unavailable. **Reset demo** in
  the top bar restores it.
- **The catalogue** is the `P` array in the script: variants, prices in ₹, materials, care, moods, spaces and
  occasions. The moods and occasions drive Find Your Feeling and the house moods.
- **Checkout** is simulated: contact and address validation, then a dynamic UPI QR (drawn from the order), UPI
  app, UPI ID, or card (Luhn check). Paying creates an order, which the owner view (`#admin`) can advance;
  stock decreases.
- **The prototype bar** switches website or installed-app layout, the opening (D, C, A, B) and the theme
  (six skins).
- **The Living Canvas** is the sticky stage at the top of the home page. A 2D canvas draws openings A and B, plus
  overlays (grain, vignette, theme effects) for C and D. Openings C and D draw on a WebGL canvas underneath it.
  Scroll progress `p` (0–1) is smoothed each frame.
- **`TOUR_ITEMS`** is the list of 3D pieces shared with the 3D modules (exposed as `window.TOUR_ITEMS`). Each
  entry is a room, a kind (`jar`, `pillar`, `tray`, `plate`, `dish`, `arch`, `pebbles`, `archtray`, `box`), a
  product id (or `null` for unlabelled props), a colour, a position, an `at` time, and options such as `place`
  (drops into place), `withPillar`, `ry` (which way it faces) and `where` (label text). Room `F` is the foyer, `BR`
  the house bedroom, and `L`/`B` are opening C's rooms. The order matters: label anchors are matched by index.

---

## 4. The 3D house: Blender to browser

### 4.1 Pipeline

```
3d/foyer.py, 3d/bedroom.py (+ houselib.py)
   │  build geometry with bmesh: boxes, arched openings cut with booleans, lathed forms
   │  stand-in "proxies" for the products, so their shadows are baked onto the shelves
   │  two UV maps per piece: "tile" (world-space, for repeating textures) and "lightmap" (packed)
   │  Cycles bakes two light states per piece
   │      day  = sunlight + sky (dusk in the bedroom)      →  lm-day-<piece>.jpg
   │      lit  = only the candle lights                     →  lm-lit-<piece>.jpg
   │  equirectangular panorama from inside the room         →  env.jpg / env-bed.jpg
   │  glTF export → converted to a JS module                →  foyer.js / bedroom.js
   ▼
prototype/assets/house/  →  house3d.js loads it all and renders with three.js
```

### 4.2 Conventions to keep

- **Coordinates.** Blender is x right, y into the house, z up. The page uses three.js coordinates: a Blender
  point `(x, y, z)` appears at `(-x, z, y)`, because the glTF export is y-up and the page turns the model round.
  `houselib.t2b()` converts page positions back to Blender (used for proxies and candle lights), so `TOUR_ITEMS`
  positions and the bake always agree.
- **Lightmap encoding.** A pixel stores `(light / 4) ^ (1/2.2)` as an 8-bit JPEG, and the page decodes
  `pow(texel, 2.2) * 4`. Bakes are denoised with OpenCV before saving.
- **Colour comes from the page, light from the bake.** Blender materials only need roughly the right base colour
  (it affects bounced light). The page multiplies its own textures and colours (plaster, oak, stone, rug,
  linen) by the lightmap. That's why moods can recolour walls without re-baking.
- **No overlapping surfaces.** A panel laid exactly over another surface blocks that surface's light and bakes
  black (this happened once in the foyer niche). Cut recesses with booleans instead.
- **Only web-safe file types.** The publisher serves `.js`, `.json`, `.jpg`, `.png` and similar, but not `.glb`
  or `.hdr`. So geometry ships as a **JS module** (`export default { gltf, bin }`, with the buffer as base64)
  that the page turns back into a GLB in memory, and panoramas ship as sRGB JPEGs. Nothing is fetched from a
  `data:` URL, which the artifact's security policy blocks.

### 4.3 Running a bake

Needs Python 3.13 with `pip install bpy opencv-python-headless`. Blender 5.2 runs headless; no GPU is needed.

```sh
python3 bud-and-things/3d/foyer.py                        # full quality → prototype/assets/house
python3 bud-and-things/3d/bedroom.py
python3 bud-and-things/3d/bedroom.py /tmp/test --fast     # quick, grainy, ~2 min: check layout and errors
python3 bud-and-things/3d/foyer.py --only=walls,niche     # re-bake just some pieces (UVs stay the same)
```

On 4 CPU cores a full room takes about 45–50 minutes, mostly the 2048 px walls (about 8 minutes per state).
Always do a `--fast` run first. The foyer is about 2 MB of assets and the bedroom about 1.2 MB.

### 4.4 Adding a room (checklist)

1. **Plan it in page coordinates:** where it joins the previous room (an arch), where light comes from (windows
   facing the sun), and the centre display, left and right shelves, and pieces.
2. **Write `3d/<room>.py`** using `houselib`. Build the walls with openings, the furniture and the shelves. Add a
   glowing block behind any opening into a lit room, so the bake neither leaks sky nor goes black there. Add the
   proxies and candle lights from the same page positions as the pieces. Set a resolution per piece.
3. **Run it with `--fast`,** look at the panorama, then run it at full quality.
4. **Add the pieces to `TOUR_ITEMS`** (a new room code, `hp: true` and walk positions as `at`), and add the room
   to `ROOMS` in `house3d.js` (module, panorama, piece names).
5. **In `house3d.js`,** add colours for the new pieces to `LOOK`, mood categories if they should recolour,
   camera keyframes to `PATH`, and the room's walk range to `roomAt`.
6. **In `index.html`,** update the opening's rail, captions and section height, plus the `where` labels in the
   details panel.
7. **Test** (section 6), **publish** (section 7).

---

## 5. The house at runtime (`prototype/house3d.js`)

- **Loading:** both rooms' geometry modules, lightmaps and panoramas load behind a quiet "Opening the house…"
  progress line, then fade in. If WebGL or loading fails, the stage says so, shows the error, and suggests
  openings A or B.
- **Baked surfaces** use a `MeshBasicMaterial` patched to read the second UV set and mix the two lightmaps:
  `light = day × kDay + lit × kLit`, with one pair of values per room.
- **The walk:** `PATH` is a list of `[p, camera, look-at]` keyframes, joined smoothly with Catmull-Rom curves. The
  foyer takes the first 56% (`FS`), the bedroom the rest. The front doors swing open early in the walk.
- **Candles and placing:**
  - In the foyer, niche candles light one by one and shelf pieces drop into place, timed from their `at`
    values.
  - In the bedroom, `at` is the walk position directly.
  - Each room's candle light (`kLit`) follows how many of its candles are lit, with a gentle flicker.
  - Real-time point lights light the 3D products.
- **Products** come from `products3d.js` and are lit by the room's panorama, so their reflections match the
  room. They are scaled 1.3×.
- **Tap to view:**
  - A label, or the "Shop this room" list, glides the camera to stand in front of the piece (it uses `ry` to
    know which side faces the room).
  - The panel offers Light it / Blow it out, Add to cart, View details, Share and ‹ ›.
  - Dragging turns the piece; Esc or scrolling returns to the walk.
- **Moods (`MOODS3`)** recolour walls and textiles, change the daylight and candle balance and the exposure, and
  show the extras:

  | Mood | Feels like | Extras |
  |---|---|---|
  | Calm | soft, cool, pale sage | none |
  | Cosy | dim daylight, strong candles, terracotta | none |
  | Fresh | bright, airy greens | none |
  | Creative | terracotta bedroom, olive textiles | none |
  | Birthday | blush | balloons |
  | Housewarming | warm neutrals | plants |
  | Festive | rani maroon, brightest candles | marigold garlands, diyas |
  | Thank you | soft neutrals | thank-you cards |

  A feeling matches a product's `mood` list and a gift matches its `occ` list. Only matching pieces are
  labelled, and the room list is filtered to them. The mood also sets the site theme (`MOOD_SKIN`).

---

## 6. Testing

The page uses three.js from the jsDelivr CDN. Where that is blocked (as in the cloud workspace this was built
in), the preview uses a local copy from npm.

```sh
LOCAL_THREE=1 sh bud-and-things/tools/preview.sh &          # http://localhost:8765/page.html
node bud-and-things/tools/test-flow.js                       # cart → checkout → UPI → order → owner view → finder
node bud-and-things/tools/test-house.js '[{"p":0.2,"w":1280},{"p":0.6,"w":390,"mood":"festive","focus":"chai-at-four"}]' /tmp
```

- Both tests need Playwright with Chromium. WebGL runs on SwiftShader (software rendering), so the house shots
  take a few seconds each, and frame rates there say nothing about real phones.
- Check every change at **1280 px and 390 px** wide, with **no page errors** and **no sideways scrolling**.
- After publishing, open the preview on a real phone. The headless browser has no security policy and no real GPU.
  Two problems only showed up on the published page: data-URL loading, and unsupported file types.

---

## 7. Publishing

1. **Branch and PR.** Work happens on `claude/ui-ux-pro-max-install-du2w6y`. After a PR is merged, the branch
   restarts from `main` for the next change. Commit messages end with the Claude attribution lines.
2. **GitHub Pages (public).** `.github/workflows/pages.yml` runs on every push to `main` that touches
   `bud-and-things/prototype/`, wraps `index.html` in a full document and deploys
   https://abhiyknp.github.io/Claude-Projects/. One-time setting: Settings → Pages → Source: **GitHub Actions**
   (done). To re-run it: Actions → *Prototype preview (GitHub Pages)* → Run workflow.
3. **Claude artifact (private).** The same `index.html` is published with its supporting files (the JS modules
   and `assets/house/*`) as https://claude.ai/artifact/Dr85NyUq11yCmEqZkMmHkr. Only the person who owns it and
   people it's shared with can open it.

---

## 8. Known limits and next steps

- **Intro length.** The house walk is long (13 screen heights). Next:
  - a short default intro (door → niche → shop);
  - the full house as an optional "Walk through the house" page;
  - "Shop now" always visible;
  - returning visitors skip it;
  - track scroll depth and skips to judge engagement.
- **Responsiveness and speed:**
  - lighter textures on phones;
  - panel and label layout on small screens;
  - touch gestures;
  - testing on real devices.
- **Real products.** The 3D pieces are stand-ins built in code. Model the real candles and Jesmonite pieces from
  photos and sizes, and replace the PDF-cut brand images with original files.
- **More rooms** (living room, dining nook) follow the checklist in 4.4.
- **Production build** (Stage 4): Next.js + Supabase + Razorpay + Capacitor, as in the README. The 3D house
  carries over as a self-contained module.
