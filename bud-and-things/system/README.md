# BUD & THINGS brand system v2.0

The full system is published as a page: https://claude.ai/artifact/3GX1y7W4KwiRMYjyXMtAnT (a copy and a zip of this folder are in the project files).

| Folder | What it holds |
|---|---|
| `tokens/` | `bud-and-things.tokens.json` (W3C design tokens), `bud-and-things.tokens.css` (light and dark), `tailwind.preset.js` |
| `components.css` | Buttons, fields, product card, chips, toast, stepper and header, built only from tokens. Load after the tokens CSS. |
| `icons/ui/` | 34 icons on a 24 px grid, 1.5 stroke, `currentColor`, plus `bud-and-things-icons.sprite.svg` |
| `templates/packaging/` | Jar front labels for five candles, back label, lid seal, tuck-end box dieline |
| `templates/print/` | Hang tag, thank-you card, gift note |
| `templates/social/` | Instagram launch, quote, story, carousel cover, highlight covers, email header, WhatsApp card |

Print SVGs are sized in mm with 3 mm bleed. Dielines and guides sit in a group called `guides-do-not-print`; hide it before sending to print. Back-label legal fields in [brackets] are placeholders to fill and check with a compliance adviser.

The logo, monogram and seal masters are in `../brand/`.
