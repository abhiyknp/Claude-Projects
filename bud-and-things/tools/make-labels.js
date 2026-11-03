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
  return `<div class="l"><b>${esc(r.name)}</b><i>${esc(r.type)}${r.scent ? ' · ' + esc(r.scent) : ''}</i>
<p>Net qty: ${esc(net)}</p><p>MRP ₹${r.price} (incl. of all taxes)</p><p>Packed: ${packed}</p>${b ? `<p>Burn time: approx ${b}</p>` : ''}
<p>Made and packed by: ${esc(MAKER)}</p><p>Consumer care: ${esc(CARE)}</p>
${candle ? '<p class="w">Trim wick to 5 mm. Burn 2 to 3 h at a time. Never leave burning unattended. Keep away from children, pets and curtains. Use on a flat, heat-safe surface. Stop at 1 cm of wax.</p>' : '<p class="w">Decorative item. Handle with care.</p>'}</div>`;
};
fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Labels ${packed}</title><style>
@page{size:A4;margin:8mm}body{font:8pt/1.25 Arial,sans-serif;margin:0}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}
.l{border:.3mm solid #8F1834;border-radius:2mm;padding:2.5mm;break-inside:avoid;overflow:hidden}.l b{display:block;font-size:10pt;color:#8F1834}.l i{display:block;margin-bottom:1mm}.l p{margin:0 0 .8mm}.w{font-size:7pt}</style>
<div class="g">${rows.filter((r) => r.show !== 'NO').map(label).join('\n')}</div>`);
console.log('Wrote ' + out + ' (' + rows.length + ' labels, packed ' + packed + ')');
