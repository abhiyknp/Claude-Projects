// Builds printable candle and object labels from the catalogue sheet. Usage: node tools/make-labels.js [out.html] [MM/YYYY]
// Packing month and year default to the current month; pass MM/YYYY to override. Details come from audit/legal/label-details.md.
const fs = require('fs'); const path = require('path');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'catalogue.sheet.json'), 'utf8'));
const out = process.argv[2] || 'labels.html';
const now = new Date(); const packed = process.argv[3] || String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
const MAKER = 'BUD & THINGS by Ashi, Amarpali Verona Heights, Tech Zone 4, Gautam Buddha Nagar, Greater Noida West, Uttar Pradesh 201318, India';
const CARE = 'Abhishek Yadav, 9839176160, hello@budandthings.com';
const burn = (t) => /tealight/i.test(t) ? '1.5 to 3 h' : /moulded/i.test(t) ? '2 to 4 h' : /jar/i.test(t) ? '12 to 18 h' : /glass|murphy/i.test(t) ? '8 to 18 h' : '';
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const label = (r) => {
  const candle = /candle/i.test(r.type); const kit = /kit/i.test(r.type);
  const net = candle ? `1 candle, ${r.grams} g` : kit ? `1 kit, ${r.grams} g` : `1 piece, about ${r.grams} g`;
  const b = candle ? burn(r.type) : '';
  return `<div class="l">
<div class="top"><span class="brand">BUD &amp; THINGS <small>by Ashi</small></span></div>
<h2>${esc(r.name)}</h2><p class="sub">${esc(r.type)}${r.scent ? ' · ' + esc(r.scent) + ' scent' : ''}</p>
<div class="key"><div><small>Net quantity</small><b>${esc(net)}</b></div><div><small>MRP (incl. of all taxes)</small><b>₹${r.price}</b></div><div><small>Packed</small><b>${packed}</b></div>${b ? `<div><small>Burn time</small><b>about ${b}</b></div>` : ''}</div>
${candle ? '<p class="care"><b>Care:</b> Trim wick to 5 mm. Burn 2 to 3 h at a time. Never leave burning unattended. Keep away from children, pets and curtains. Use on a flat, heat-safe surface. Stop at 1 cm of wax.</p>' : '<p class="care"><b>Care:</b> Decorative item. Handle with care.</p>'}
<p class="small"><b>Made and packed by:</b> ${esc(MAKER)}</p><p class="small"><b>Consumer care:</b> ${esc(CARE)}</p></div>`;
};
fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Labels ${packed}</title><style>
@page{size:A4;margin:8mm}*{box-sizing:border-box}body{font:9pt/1.35 Arial,Helvetica,sans-serif;margin:0;color:#150206}
.g{display:grid;grid-template-columns:repeat(2,1fr);gap:4mm}
.l{border:.4mm solid #8F1834;border-radius:2.5mm;padding:3mm 3.5mm;break-inside:avoid;background:#F8F0E4}
.top{border-bottom:.4mm solid #D6A34A;padding-bottom:1.2mm;margin-bottom:1.5mm}.brand{font-weight:700;letter-spacing:.12em;font-size:8pt;color:#8F1834}.brand small{font-weight:400;letter-spacing:0;font-size:7.5pt}
h2{margin:0;font:700 14pt/1.15 Georgia,serif;color:#7A1229}.sub{margin:.5mm 0 2mm;font-size:8.5pt}
.key{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm 3mm;margin-bottom:2mm}.key small{display:block;font-size:7pt;color:#555;text-transform:uppercase;letter-spacing:.04em}.key b{font-size:10.5pt}
.care{margin:0 0 1.5mm;font-size:8pt}.small{margin:0 0 .8mm;font-size:7.5pt}</style>
<div class="g">${rows.filter((r) => r.show !== 'NO').map(label).join('\n')}</div>`);
console.log('Wrote ' + out + ' (' + rows.length + ' labels, packed ' + packed + ')');
