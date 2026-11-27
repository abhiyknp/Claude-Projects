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
  const candle = /candle/i.test(r.type) || !!r.set; const kit = /kit/i.test(r.type); const pack = r.pack || 1;
  const net = r.set ? `Set of ${r.set} candles, ${r.grams} g in all` : pack > 1 ? `Pack of ${pack} candles, ${r.grams * pack} g in all` : candle ? `1 candle, ${r.grams} g` : kit ? `1 kit, ${r.grams} g` : `1 piece, about ${r.grams} g`;
  const short = r.set ? `Set of ${r.set}, ${r.grams} g` : pack > 1 ? `${pack} candles, ${r.grams * pack} g` : candle ? `${r.grams} g` : kit ? `1 kit, ${r.grams} g` : `about ${r.grams} g`;
  const name = r.name + (pack > 1 ? ' · Pack of ' + pack : '');
  return { candle, net, short, name, b: candle ? burn(r.type) : '' };
};
const labelL = (r) => { const i = info(r); return `<div class="l L"><div class="top"><span class="brand">BUD &amp; THINGS <small>by Ashi</small></span></div>
<h2>${esc(i.name)}</h2><p class="sub">${esc(r.type)}${r.scent ? ' · ' + esc(r.scent) + ' scent' : ''}</p>
<div class="key"><div><small>Net quantity</small><b>${esc(i.net)}</b></div><div><small>MRP (incl. of all taxes)</small><b>₹${r.price}</b></div><div><small>Packed</small><b>${packed}</b></div>${i.b ? `<div><small>Burn time</small><b>about ${i.b}</b></div>` : ''}</div>
<p class="care"><b>Care:</b> ${i.candle ? CARE_C : CARE_O}</p>
<p class="small"><b>Made in India by</b> ${esc(MAKER)}. <b>Consumer care:</b> ${esc(CARE)}</p></div>`; };
// Minimal labels: only the mandatory legal-metrology facts (name, net quantity, MRP, packing month, maker and address, consumer care contact). Safety and care text is on the care card.
// Designed layout: maroon monogram panel, scent line (from the approved shop copy), big weight and price, QR to the product page, legal strip.
const BR = path.join(__dirname, '..', 'brand');
const mono = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(BR, 'monograms', 'encircled', 'bud-and-things-monogram-encircled-gold.svg')).toString('base64');
const qrgen = require(path.join(__dirname, '..', 'prototype', 'vendor', 'qrcode', 'qrcode.js'));
const qrSvg = (url) => { const q = qrgen(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 1, margin: 0, scalable: true }); };
const smell = {};
try { fs.readFileSync(path.join(__dirname, '..', 'supabase', 'apply-product-copy-2026-11-26.sql'), 'utf8').split('\n').forEach((l) => { const m = l.match(/'smellsLike', to_jsonb\(\$j\$(.*?)\$j\$::text\)/); const k = l.match(/where id = '([a-z0-9-]+)'/); if (m && k) smell[k[1].toUpperCase()] = m[1]; }); } catch (e) { /* no scent lines */ }
const LEGAL = 'Made in India by BUD & THINGS by Ashi, Amarpali Verona Heights, Tech Zone 4, Greater Noida West, UP 201318 · hello@budandthings.com';
const qty = (r, i) => r.set ? `Set of ${r.set} · ${r.grams} g` : i.short;
const url = (r) => 'https://budandthings.com/#p-' + String(r.id).toLowerCase();
const labelMrich = (r) => { const i = info(r); const sm = smell[r.id]; return `<div class="l M"><div class="pn"><img src="${mono}"></div>
<div class="bd"><div class="eb">${esc(r.type)}</div><div class="nm${i.name.length > 24 ? ' long' : ''}">${esc(i.name)}</div>${sm ? `<div class="sc">${esc(sm)}</div>` : ''}
<div class="rule"></div><div class="big"><span>${esc(qty(r, i))}</span><b>₹${r.price}</b></div><div class="fine">MRP incl. of all taxes · Packed ${packed}</div></div>
<div class="qr">${qrSvg(url(r))}<small>Scan: see it<br>in the shop</small></div>
<div class="legal">${esc(LEGAL)}</div></div>`; };
const labelSrich = (r) => { const i = info(r); return `<div class="l S"><div class="bar"></div><div class="top"><div class="nm">${esc(i.name)}</div><img src="${mono}"></div>
<div class="big"><span>${esc(qty(r, i))}</span><b>₹${r.price}</b></div><div class="fine">MRP incl. taxes · Packed ${packed}</div>
<div class="legal">${esc(LEGAL)}</div></div>`; };

// Minimal style (default): gold monogram, name, weight and price, one small legal line. LABEL_STYLE=rich gives the designed version with scent line and QR.
const LEGAL_MIN = 'Packed ' + packed + ' · MRP incl. of all taxes · Made in India by BUD & THINGS by Ashi, Amarpali Verona Heights, Tech Zone 4, Greater Noida West, UP 201318 · hello@budandthings.com';
const labelMin = (r, t) => { const i = info(r); return `<div class="l ${t} mn"><div class="nm${i.name.length > 24 ? ' long' : ''}">${esc(i.name)}</div><div class="wp">${esc(qty(r, i))} <i>·</i> <b>₹${r.price}</b></div><div class="lg">${esc(LEGAL_MIN)}</div></div>`; };
const labelM = process.env.LABEL_STYLE === 'rich' ? labelMrich : (r) => labelMin(r, 'M');
const labelS = process.env.LABEL_STYLE === 'rich' ? labelSrich : (r) => labelMin(r, 'S');
const list = rows.filter((r) => r.show !== 'NO'); const by = { M: [], S: [] };
list.forEach((r) => { for (let c = 0; c < COPIES; c++) by[tier(r)].push(r); });
const page = (title, cls, items, fn) => { const n = cls === 'M' ? 21 : 40; let h = ''; for (let k = 0; k < items.length; k += n) h += `<section class="pg"><h3 class="noprint">${title}${items.length > n ? ' (sheet ' + (k / n + 1) + ')' : ''}</h3><div class="g ${cls}">${items.slice(k, k + n).map(fn).join('\n')}</div></section>`; return h; };
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
h2{margin:0;font:700 10.5pt/1.1 Georgia,serif;color:#7A1229}.M h2{font-size:12pt;margin:0 0 1.6mm}.S h2{font-size:8pt}.card h2{font-size:13pt;margin:2mm 0}
.sub{margin:.3mm 0 1.2mm;font-size:6.5pt}.M .sub{margin:.2mm 0 .8mm;font-size:6pt}
.key{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:1mm 2mm;margin-bottom:1mm}.key small{display:block;font-size:4.8pt;color:#555;text-transform:uppercase;letter-spacing:.03em}.key b{font-size:7.2pt}
.row{margin:.4mm 0 1mm;font-size:7.6pt}.S .row{font-size:5pt;margin:.4mm 0}.row small{font-size:4.6pt}
.care{margin:0 0 .8mm;font-size:5.6pt}.small{margin:0;font-size:4.9pt;line-height:1.22}.M .small{font-size:5.8pt}.S .small{font-size:4pt;line-height:1.16}.card p{font-size:8.5pt;margin:0 0 2mm}.card .small{font-size:6.5pt}
@font-face{font-family:PF;src:url("file://${BR}/fonts/PlayfairDisplay[wght].ttf");font-weight:400 900}@font-face{font-family:PF;font-style:italic;src:url("file://${BR}/fonts/PlayfairDisplay-Italic[wght].ttf");font-weight:400 900}@font-face{font-family:MS;src:url("file://${BR}/fonts/Montserrat[wght].ttf");font-weight:100 900}
.l{font-family:MS,Arial,sans-serif;display:grid;position:relative;color:#150206}
.M{grid-template-columns:11mm 1fr 11mm;grid-template-rows:1fr auto;padding:0}.M .pn{background:#8F1834;grid-row:1/3;display:flex;align-items:center;justify-content:center}.M .pn img{width:8mm}
.M .bd{padding:2.2mm 1.2mm 0 2.6mm}.M .qr{padding:2.2mm 2.2mm 0 0;text-align:center}.M .qr svg{width:9.5mm;height:9.5mm;display:block;margin:0 auto}.M .qr small{display:block;font-size:3.3pt;line-height:1.2;color:#7A1229;margin-top:.7mm}
.eb{font-size:4.2pt;letter-spacing:.16em;text-transform:uppercase;color:#B07F1E;font-weight:600}
.nm{font:700 11.5pt/1.05 PF,Georgia,serif;color:#7A1229;margin-top:.5mm}
.sc{font:italic 400 5.6pt/1.25 PF,Georgia,serif;color:#3a2a2e;margin-top:.9mm;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.M .nm.long{font-size:9.4pt}.rule{height:.3mm;width:12mm;background:#D6A34A;margin:1.2mm 0}
.big{display:flex;justify-content:space-between;align-items:baseline;font-size:6.6pt;font-weight:600;gap:2mm}.big b{font:700 14pt PF,Georgia,serif;color:#150206}
.fine{font-size:4.2pt;color:#6b5a5e;margin:.4mm 0 0}
.legal{font-size:3.7pt;line-height:1.2;color:#6b5a5e;padding:.6mm 2.2mm 1.3mm 2.6mm}.M .legal{grid-column:2/4}
.S{padding:0;grid-template-rows:auto auto auto 1fr}.S .bar{height:1.3mm;background:#8F1834}.S .top{display:flex;justify-content:space-between;align-items:flex-start;padding:1.1mm 1.7mm 0}.S .top img{width:5.4mm;background:#8F1834;border-radius:50%;padding:.5mm}
.S .nm{font-size:8.4pt}.S .big{padding:.6mm 1.7mm 0;font-size:5.6pt}.S .big b{font-size:10pt}.S .fine{padding:0 1.7mm}.S .legal{font-size:3.2pt;padding:.5mm 1.7mm 1mm;align-self:end}
.mn{text-align:center;align-items:center;justify-content:flex-start;flex-direction:column;display:flex;padding:0}.mn .mo{width:6.5mm;margin-top:2.4mm}.S.mn .mo{width:4.6mm;margin-top:1.4mm}
.mn .nm{font-size:13pt;margin:4.2mm 2mm 0;color:#7A1229}.mn .nm.long{font-size:9.6pt}.S.mn .nm{font-size:9pt;margin-top:2.4mm}
.mn .wp{font:600 7.6pt MS,Arial,sans-serif;margin-top:1mm;letter-spacing:.04em}.mn .wp b{font:700 11pt PF,Georgia,serif;letter-spacing:0}.mn .wp i{color:#D6A34A;font-style:normal}.S.mn .wp{font-size:5.6pt}.S.mn .wp b{font-size:8.6pt}
.mn .lg{margin-top:auto;font-size:4.4pt;line-height:1.25;color:#6b5a5e;padding:0 3mm 1.8mm}.S.mn .lg{font-size:3.5pt;padding:0 1.6mm 1.1mm}
</style>${page('Labels 63.5 x 38.1 mm (21 to a sheet)', 'M', by.M, labelM)}${page('Labels 45.7 x 25.4 mm (40 to a sheet)', 'S', by.S, labelS)}${cards}`);
console.log('Wrote ' + out + ' (' + list.length + ' products; 63.5 x 38.1 mm: ' + by.M.length + ', 45.7 x 25.4 mm: ' + by.S.length + '; packed ' + packed + ')');
