// Moves the page's big inline script into its own minified file, so the browser can cache it between visits and the
// home page HTML stays small. The source page is not changed (it is also published as a Claude artifact, which needs the
// script inline); this runs on the built site only.
//   node bud-and-things/tools/split-js.js _site            (run by .github/workflows/pages.yml, before add-csp.js)
// ESBUILD_PATH points at an installed esbuild; without it the script is moved as it is, not minified.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = process.argv[2]; if (!dir) { console.error('usage: split-js.js <site folder>'); process.exit(1); }
const file = path.join(dir, 'index.html');
const html = fs.readFileSync(file, 'utf8');
// the app script is the one plain <script> block that holds the app itself (the others are tiny or have attributes)
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].filter((m) => m[1].length > 100000);
if (blocks.length !== 1) { console.error(`split-js: expected one big inline script, found ${blocks.length}; leaving the page as it is`); process.exit(0); }
let js = blocks[0][1];
if (process.env.ESBUILD_PATH) js = require(process.env.ESBUILD_PATH).transformSync(js, { minify: true, target: 'es2020' }).code;
const name = 'app.' + crypto.createHash('sha256').update(js).digest('hex').slice(0, 10) + '.js';
fs.writeFileSync(path.join(dir, name), js);
fs.writeFileSync(file, html.replace(blocks[0][0], () => `<script src="${name}"></script>`));
console.log(`split-js: ${blocks[0][1].length} bytes inline → ${name} (${js.length} bytes)`);
