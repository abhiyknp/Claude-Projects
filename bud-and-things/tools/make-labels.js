// Builds printable labels from the master sheet, in three sizes so small pieces get a label that fits.
// Usage: node tools/make-labels.js [out.html] [MM/YYYY]    (COPIES=3 prints three of each label)
// The packing month and year default to the current month; pass MM/YYYY to override. Details come from audit/legal/label-details.md.
// Two sizes that match the common A4 sticker sheets (21 and 40 labels to a sheet):
// M 63.5 x 38.1 mm (3 x 7 per sheet): glass, Murphy, urli, pillar and larger moulded candles, tealight packs, Jesmonite trays and dishes, the paint kit.
// S 45.7 x 25.4 mm (4 x 10 per sheet): small moulded candles of 35 g or less and the dessert jar.
// A "care card" page is added for the candle and object care lines (it carries the safety text the small labels have no room for).
const fs = require('fs'); const path = require('path');
const LABELS = path.join(__dirname, '..', 'data', 'labels.products.json');
const rows = JSON.parse(fs.readFileSync(fs.existsSync(LABELS) ? LABELS : path.join(__dirname, '..', 'data', 'catalogue.sheet.json'), 'utf8'));
const out = process.argv[2] || 'labels.html';
const now = new Date(); const packed = process.argv[3] || String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
const COPIES = Math.max(1, parseInt(process.env.COPIES || '1', 10));
const MAKER = 'BUD & THINGS by Ashi, Amarpali Verona Heights, Tech Zone 4, Gautam Buddha Nagar, Greater Noida West, Uttar Pradesh 201318, India';
const CARE = 'Abhishek Yadav, 9839176160, hello@budandthings.com';
// Burn times are printed only when BURN_TESTED=1 is set, after real burn tests (tasks/AFTER_LAUNCH.md). The ranges below are untested estimates.
const burn = (t) => !process.env.BURN_TESTED ? '' : t0(t);
const t0 = (t) => /tealight/i.test(t) ? '1.5 to 3 h' : /moulded/i.test(t) ? '2 to 4 h' : /jar/i.test(t) ? '12 to 18 h' : /glass|murphy/i.test(t) ? '8 to 18 h' : '';
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CARE_C = 'Trim wick to 5 mm. Burn 2 to 3 h at a time. Never leave burning unattended. Keep away from children, pets and curtains. Use on a flat, heat-safe surface. Stop at 1 cm of wax.';
const CARE_O = 'Decorative item. Handle with care.';
const tier = (r) => {
  const t = String(r.type || '').toLowerCase(); const g = +r.grams || 0;
  if (/moulded/.test(t)) return g <= 35 ? 'S' : 'M';
  if (/jar candle/.test(t)) return 'S';
  return 'M';
};
const info = (r) => {
  const candle = /candle/i.test(r.type); const kit = /kit/i.test(r.type); const pack = r.pack || 1;
  const net = pack > 1 ? `Pack of ${pack} candles, ${r.grams * pack} g in all` : candle ? `1 candle, ${r.grams} g` : kit ? `1 kit, ${r.grams} g` : `1 piece, about ${r.grams} g`;
  const short = pack > 1 ? `${pack} candles, ${r.grams * pack} g` : candle ? `${r.grams} g` : kit ? `1 kit, ${r.grams} g` : `about ${r.grams} g`;
  const name = r.name + (pack > 1 ? ' · Pack of ' + pack : '');
  return { candle, net, short, name, b: candle ? burn(r.type) : '' };
};
const labelL = (r) => { const i = info(r); return `<div class="l L"><div class="top"><span class="brand">BUD &amp; THINGS <small>by Ashi</small></span></div>
<h2>${esc(i.name)}</h2><p class="sub">${esc(r.type)}${r.scent ? ' · ' + esc(r.scent) + ' scent' : ''}</p>
<div class="key"><div><small>Net quantity</small><b>${esc(i.net)}</b></div><div><small>MRP (incl. of all taxes)</small><b>₹${r.price}</b></div><div><small>Packed</small><b>${packed}</b></div>${i.b ? `<div><small>Burn time</small><b>about ${i.b}</b></div>` : ''}</div>
<p class="care"><b>Care:</b> ${i.candle ? CARE_C : CARE_O}</p>
<p class="small"><b>Made in India by</b> ${esc(MAKER)}. <b>Consumer care:</b> ${esc(CARE)}</p></div>`; };
const labelM = (r) => { const i = info(r); return `<div class="l M"><div class="brand">BUD &amp; THINGS <small>by Ashi</small></div>
<h2>${esc(i.name)}</h2><p class="sub">${esc(r.type)}${r.scent ? ' · ' + esc(r.scent) : ''}</p>
<p class="row"><b>${esc(i.net)}</b> · <b>MRP ₹${r.price}</b> <small>(incl. of all taxes)</small> · Packed <b>${packed}</b></p>
<p class="small"><b>Made in India by</b> ${esc(MAKER)}. <b>Care:</b> ${esc(CARE)}</p></div>`; };
const labelS = (r) => { const i = info(r); return `<div class="l S"><h2>${esc(i.name)}</h2>
<p class="row"><b>${esc(i.short)}</b> · <b>MRP ₹${r.price}</b> <small>(incl. of all taxes)</small> · Packed <b>${packed}</b></p>
<p class="small"><b>Made in India by</b> ${esc(MAKER)}. <b>Care:</b> ${esc(CARE)}</p></div>`; };
const list = rows.filter((r) => r.show !== 'NO'); const by = { M: [], S: [] };
list.forEach((r) => { for (let c = 0; c < COPIES; c++) by[tier(r)].push(r); });
const page = (title, cls, items, fn) => items.length ? `<section class="pg"><h3 class="noprint">${title}</h3><div class="g ${cls}">${items.map(fn).join('\n')}</div></section>` : '';
const card = (title, text) => `<div class="card"><div class="brand">BUD &amp; THINGS <small>by Ashi</small></div><h2>${title}</h2><p>${text}</p><p class="small">Questions? ${esc(CARE)}</p></div>`;
const cards = `<section class="pg"><h3 class="noprint">Care cards, 85 x 55 mm (one for each box; print as many as you need)</h3><div class="g C">${card('Care for your candle', CARE_C)}${card('Care for your piece', CARE_O + ' Wipe with a soft, damp cloth. Not dishwasher-safe and not for food.')}</div></section>`;
fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Labels ${packed}</title><style>
@page{size:A4;margin:8mm}*{box-sizing:border-box}body{font:7pt/1.25 Arial,Helvetica,sans-serif;margin:0;color:#150206}
.pg{break-after:page}.noprint{font:700 9pt Arial;color:#8F1834;margin:0 0 3mm}@media print{.noprint{display:none}}
.g{display:grid;gap:2mm;justify-content:start}.g.M{grid-template-columns:repeat(3,63.5mm)}.g.S{grid-template-columns:repeat(4,45.7mm)}.g.C{grid-template-columns:repeat(2,85mm)}
.l,.card{border:.25mm solid #8F1834;border-radius:1.5mm;background:#F8F0E4;overflow:hidden;break-inside:avoid}
.M{width:63.5mm;height:38.1mm;padding:2mm 2.6mm}.S{width:45.7mm;height:25.4mm;padding:1.3mm 1.7mm}.card{width:85mm;height:55mm;padding:4mm}
.brand{font-weight:700;letter-spacing:.1em;font-size:5.5pt;color:#8F1834}.brand small{font-weight:400;letter-spacing:0;font-size:5.5pt}
.top{border-bottom:.25mm solid #D6A34A;padding-bottom:.8mm;margin-bottom:1mm}
h2{margin:0;font:700 10.5pt/1.1 Georgia,serif;color:#7A1229}.M h2{font-size:10pt;margin-top:.6mm}.S h2{font-size:7.4pt}.card h2{font-size:13pt;margin:2mm 0}
.sub{margin:.3mm 0 1.2mm;font-size:6.5pt}.M .sub{margin:.2mm 0 .8mm;font-size:6pt}
.key{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:1mm 2mm;margin-bottom:1mm}.key small{display:block;font-size:4.8pt;color:#555;text-transform:uppercase;letter-spacing:.03em}.key b{font-size:7.2pt}
.row{margin:.4mm 0 1mm;font-size:6.8pt}.S .row{font-size:5pt;margin:.4mm 0}.row small{font-size:4.6pt}
.care{margin:0 0 .8mm;font-size:5.6pt}.small{margin:0;font-size:4.9pt;line-height:1.22}.M .small{font-size:5pt}.S .small{font-size:4pt;line-height:1.16}.card p{font-size:8.5pt;margin:0 0 2mm}.card .small{font-size:6.5pt}
</style>${page('Labels 63.5 x 38.1 mm (21 to a sheet)', 'M', by.M, labelM)}${page('Labels 45.7 x 25.4 mm (40 to a sheet)', 'S', by.S, labelS)}${cards}`);
console.log('Wrote ' + out + ' (' + list.length + ' products; 63.5 x 38.1 mm: ' + by.M.length + ', 45.7 x 25.4 mm: ' + by.S.length + '; packed ' + packed + ')');
