# Intro prototypes (A, B, C)

The three scroll intros that were tried on the BUD & THINGS homepage and set aside when the site kept only
**D · The House** (the foyer walk). They are kept here, working, to reuse on another project.

| Intro | What happens as you scroll | Where the code is |
|---|---|---|
| **A · Through the Arches** | Walk through a run of plaster arches into a room; the pieces light up as day turns to dusk | `sceneArches()` in `index.html`, drawn on a 2D canvas |
| **B · The Pour** | A candle is sketched, poured, cast and lifted from the mould, then the arrangement is lit | `scenePour()` in `index.html`, drawn on a 2D canvas |
| **C · Home Tour** | A 3D walk from the front door through the foyer, living room and bedroom, with labelled pieces | `tour3d.js` (three.js, in `vendor/`), placed by `TOUR_ITEMS` in `index.html` |

Shared pieces: `OPENINGS` in `index.html` holds each intro's captions, rail labels and timing; `lcFrame()` turns
scroll position into a 0 to 1 progress value that the scene draws from. `products3d.js` models the candles and
objects used by C. The six colour themes still work here from the top bar (they are also kept on their own in
[`../theme-kit`](../theme-kit)).

This is a full copy of the shop prototype as it was on 18 Oct 2026, with the House intro and its 3D rooms taken out
and no database connected (everything runs in the browser).

## See them

```sh
sh intro-prototypes/serve.sh      # then open http://localhost:8770/page.html
```

Pick the intro from the **Opening** menu in the dark bar at the top, then scroll the homepage.

## Reusing one on another project

1. Copy the scene function you want (and, for C, `tour3d.js`, `products3d.js` and `vendor/`).
2. Keep the canvas, `layout()`, `lcFrame()`/`lcTarget()` scroll loop and the `OPENINGS` entry for it.
3. Swap the objects in `ARR` (A and B) or `TOUR_ITEMS` (C) for the new project's products, and the colours in
   `SKINS` for its palette.
