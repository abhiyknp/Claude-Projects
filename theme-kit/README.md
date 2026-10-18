# Theme kit

The six colour themes from the BUD & THINGS site, kept on their own so another project can use them.

| Theme | For |
|---|---|
| **Signature** · approved palette | The brand palette: ivory, sand, caramel, terracotta, olive, chocolate. The default |
| **Everyday** · Clay & Cocoa | Year-round: terracotta room, cocoa floor, peach glow |
| **Festive** · Saffron & Rani | Diwali and the festive rush: rani pink, saffron light |
| **Monsoon** · Peacock & Moss | June to September: deep peacock, moss light |
| **Gifting** · Cherry & Blush | Gifting campaigns, weddings, Valentine's week |
| **Evening** · Indigo & Brass | Night-time browsing, dark-mode phones (the only dark theme) |

## Files

- `themes.css`: every theme as CSS custom properties. Link it, build the UI with `var(--ivory)`, `var(--choc)`,
  `var(--cta)` and so on, then switch with `<html data-skin="festive">`. No attribute means Signature.
- `themes.json`: the same, as data: name, when to use it, the hero eyebrow line, every CSS colour, and the `stage`
  colours the homepage's 3D/canvas room used (walls, floor, arches, light, dusk).
- `index.html`: a preview with a switcher and swatches. Serve the folder (`python3 -m http.server` here) and open it.

## Colour roles

`--ivory` page background · `--card` panels · `--choc` / `--choc2` text · `--line` / `--line2` borders ·
`--cta` / `--on-cta` main button · `--terra`, `--olive`, `--caramel` accents · `--ok`, `--warn`, `--ok-bg`,
`--err-bg` messages · `--sk-*` text and buttons laid over the hero.

On the BUD & THINGS site the theme is now chosen by the owner in Owner view → Settings.
