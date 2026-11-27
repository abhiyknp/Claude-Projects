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
const tier = () => 'M'; // one label size for every product (stuck on the pouch or card, so the piece size does not matter)
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
const labelMin = (r, t) => { const i = info(r); return `<div class="l ${t} mn"><img class="mo" src="${mono}"><div class="nm${i.name.length > 24 ? ' long' : ''}">${esc(i.name)}</div><div class="wp">${esc(qty(r, i))} <i>·</i> <b>₹${r.price}</b></div><div class="lg">${esc(LEGAL_MIN)}</div></div>`; };

// LOCKED DESIGN (Silk & Gold): maroon silk, double gold frame, leaf, brand line, diamond divider, type line, name, tagline,
// weight bottom-left, price bottom-right, web and email centre, care line under a gold rule. One size, 63.5 x 38.1 mm.
const AS = 'file://' + path.join(__dirname, '..', 'prototype', 'assets');
const labelPrem = (r) => { const i = info(r); const obj = !i.candle && !(/kit/i.test(r.type));
  const tag = esc(String(r.type).replace(/ candle set$/i, ' candle set')) + (r.scent && !/^(random|n\/a)$/i.test(r.scent) ? ' · ' + esc(r.scent) : '');
  const care = i.candle ? 'Trim wick to 5 mm · Never leave a burning candle unattended' : /kit/i.test(r.type) ? 'Handle with care' : 'Decorative item · Handle with care';
  const q = r.set ? `Set of ${r.set} · ${r.grams} g` : i.short;
  const nm = r.name + (r.pack > 1 ? ' · Pack of ' + r.pack : ''); const cls = nm.length > 30 ? ' xl' : nm.length > 22 ? ' lg' : '';
  return `<div class="l M pm"><div class="fr"></div><div class="fr2"></div><img class="leaf" src="${AS}/silk/leaf.webp"><div class="br">BUD &amp; THINGS <i>by Ashi</i></div>
<div class="dv"><span></span></div><div class="ty">${tag}</div><div class="nm${cls}">${esc(nm)}</div><div class="tg">Made with thought. Given with feeling.</div>
<div class="bt"><span class="q${q.length > 9 ? ' ql' : ''}">${esc(q)}</span><span class="ft${q.length > 9 ? ' fl' : ''}">www.budandthings.com · hello@budandthings.com</span><span class="p">₹${r.price}</span></div>
<div class="cr">Packed ${packed} · ${esc(care)}</div></div>`; };
const labelM = process.env.LABEL_STYLE === 'rich' ? labelMrich : process.env.LABEL_STYLE === 'min' ? (r) => labelMin(r, 'M') : labelPrem;
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
.mn{text-align:center;align-items:center;justify-content:flex-start;flex-direction:column;display:flex;padding:0}.mn .mo{width:7.5mm;margin-top:2.4mm}.S.mn .mo{width:4.6mm;margin-top:1.4mm}
.mn .nm{font-size:12.5pt;margin:1.2mm 2mm 0;color:#7A1229}.mn .nm.long{font-size:9.6pt}.S.mn .nm{font-size:8.6pt;margin-top:.8mm}
.mn .wp{font:600 7.6pt MS,Arial,sans-serif;margin-top:1mm;letter-spacing:.04em}.mn .wp b{font:700 11pt PF,Georgia,serif;letter-spacing:0}.mn .wp i{color:#D6A34A;font-style:normal}.S.mn .wp{font-size:5.6pt}.S.mn .wp b{font-size:8.6pt}
.mn .lg{margin-top:auto;font-size:4.4pt;line-height:1.25;color:#6b5a5e;padding:0 3mm 1.8mm}.S.mn .lg{font-size:3.5pt;padding:0 1.6mm 1.1mm}
.pm{background:#2a0610 url(${AS}/silk/velvet.webp) center/cover;padding:3mm 4mm 2.8mm;display:flex;flex-direction:column;align-items:center;text-align:center;color:#F6E3B4;border:0;position:relative}
.pm .fr{position:absolute;inset:1.3mm;border:.22mm solid #D6A34A;border-radius:1mm}.pm .fr2{position:absolute;inset:2mm;border:.12mm solid rgba(214,163,74,.55);border-radius:.7mm}
.pm .leaf{height:7.4mm;filter:drop-shadow(0 .2mm .4mm rgba(0,0,0,.5))}
.pm .br{font:700 10.4pt/1.1 PF,Georgia,serif;color:#F6E3B4;text-shadow:0 .2mm .5mm rgba(0,0,0,.6);margin-top:.6mm}.pm .br i{font:italic 400 7pt PF,Georgia,serif;color:#D9B96E;letter-spacing:.03em}
.pm .dv{display:flex;align-items:center;gap:1.4mm;margin:1.2mm 0 .9mm}.pm .dv:before,.pm .dv:after{content:"";width:10mm;height:.2mm;background:linear-gradient(90deg,transparent,#D6A34A)}.pm .dv:after{background:linear-gradient(90deg,#D6A34A,transparent)}.pm .dv span{width:1mm;height:1mm;background:#D6A34A;transform:rotate(45deg)}
.pm .ty{font:600 3.6pt MS,Arial,sans-serif;letter-spacing:.26em;text-transform:uppercase;color:#B99A55;margin-bottom:.5mm}
.pm .nm{font:500 7pt/1.15 PF,Georgia,serif;letter-spacing:.06em;color:#E9C46A;margin-top:0}.pm .nm.lg{font-size:6.2pt}.pm .nm.xl{font-size:5.4pt}
.pm .tg{font:italic 400 4.6pt PF,Georgia,serif;letter-spacing:.04em;color:#D9B96E;margin-top:1mm}
.pm .bt{position:absolute;left:3.4mm;right:3.4mm;bottom:5.4mm;display:flex;justify-content:space-between;align-items:flex-end}
.pm .q,.pm .p{font:600 6.4pt MS,Arial,sans-serif;color:#F1DDB0;letter-spacing:.04em;white-space:nowrap}.pm .ft{font:500 3.7pt/1.5 MS,Arial,sans-serif;letter-spacing:.06em;white-space:nowrap;color:#D9B96E}
.pm .q.ql{font-size:5pt;letter-spacing:.02em}.pm .ft.fl{font-size:3.3pt;letter-spacing:.03em}.pm .cr{position:absolute;left:3.4mm;right:3.4mm;bottom:2.9mm;text-align:center;font:500 3.5pt/1.3 MS,Arial,sans-serif;letter-spacing:.05em;color:#C9AA68;white-space:nowrap}.pm .cr:before{content:"";display:block;width:100%;height:.12mm;background:linear-gradient(90deg,transparent,rgba(214,163,74,.6),transparent);margin-bottom:.7mm}
</style>${page('Labels 63.5 x 38.1 mm (21 to a sheet)', 'M', by.M, labelM)}${page('Labels 45.7 x 25.4 mm (40 to a sheet)', 'S', by.S, labelS)}${cards}`);
console.log('Wrote ' + out + ' (' + list.length + ' products; 63.5 x 38.1 mm: ' + by.M.length + ', 45.7 x 25.4 mm: ' + by.S.length + '; packed ' + packed + ')');
