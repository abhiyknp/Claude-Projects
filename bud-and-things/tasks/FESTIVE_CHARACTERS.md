# Festive characters: what to generate

Each festive look can show characters at random: one leaning on the main button (home page, and cart on desktop), a different one on the footer ribbon, and one waving on the thank-you screen. Add more characters and the shop picks among them at random; nothing else needs to change.

## How to make one
1. Generate the picture (ChatGPT images, Gemini, Midjourney) with the prompt below. Landscape 3:2, plain bright green background.
2. Send it to Claude, or run it yourself:
   `python3 bud-and-things/tools/cut-character.py picture.png <look> <pose> <name>`
   (look: `xmas ny val diw holi eid bday`; pose: `peek` or `wave`; name: a short word such as `elf`).
3. The script cuts out the green, saves `prototype/assets/festive/chars/<look>-<pose>-<name>.webp` and lists it in `manifest.json`. The shop uses it after the next deploy.

## The shared style (paste at the start of every prompt)
> 3D animated-film style character render in Pixar quality: soft glossy materials, fine fur or fabric detail, big expressive eyes, a warm friendly smile, gentle studio lighting, high detail. Plain flat bright green background with no shadows or gradient on it. Landscape 3:2. No text, no logos, no watermark.

## The two poses (add one at the end)
- **peek:** *The character peeks over a flat horizontal ledge that fills the bottom of the picture. Only the head, shoulders and both hands resting on the edge are visible. Looking at the viewer. The ledge is exactly the same green as the background.*
- **wave:** *Upper body in the centre of the frame, three-quarter view, waving one hand and smiling at the viewer. No ledge.*

## What to generate, in order of need
| Look | When | Pose | Character |
|---|---|---|---|
| Christmas `xmas` | from 1 Dec | peek (done) | Santa with round glasses |
| | | peek (done) | a cheerful elf in a red-and-green hat with pointed ears |
| | | peek | a cute snowman with a knitted scarf and a carrot nose |
| | | peek | a friendly reindeer with a red nose and small antlers |
| | | wave | Santa waving |
| New Year `ny` | 31 Dec | peek | a penguin in a sparkly gold party hat blowing a party horn |
| | | peek | a fox in a shiny top hat and bow tie, confetti in the air |
| | | wave | the penguin waving, holding a sparkler |
| Valentine's `val` | 14 Feb | peek | a teddy bear with tiny angel wings holding a heart |
| | | peek | a bunny holding a single red rose |
| | | wave | the teddy bear waving with a heart |
| Holi `holi` | about 22 Mar | peek | a playful boy with bright colour powder on his hair and cheeks |
| | | peek | a laughing girl holding a pichkari (water gun), colour on her kurta |
| | | wave | the boy waving, both hands covered in colour |
| Eid `eid` | about 10 Mar | peek | a smiling boy in a kurta holding a glowing fanoos lantern |
| | | peek | a smiling girl in a dupatta holding a small lantern |
| | | wave | the boy waving, lantern in the other hand |
| Diwali `diw` | next Oct or Nov | peek | a smiling girl in a festive lehenga with a marigold garland, holding a lit diya |
| | | peek | a smiling boy in a kurta holding a sparkler |
| | | wave | the girl waving, diya in the other hand |
| Birthday `bday` | any day | peek | a bear in a party hat holding a balloon |
| | | peek | a bunny with a cupcake with one candle |
| | | wave | the bear waving |

Keep the characters friendly and respectful: no religious figures or symbols used as props, no people from real life, no brands. Only use pictures you may use commercially.

## Where they appear
- **Main button** (home page, and cart on desktop): a random `peek` character, hands on the button's edge.
- **Footer ribbon** (every page except checkout and payment): a different `peek` character, or the same one when there is only one.
- **Thank-you screen:** a random `wave` character.
- **Never** on product pages' Add to cart button, on checkout or payment pages, over text or prices, or on phones except the home page.
