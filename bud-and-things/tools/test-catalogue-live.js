// Checks how the live catalogue is put together: sold out, upcoming, back-up from the sheet, no drafts, safe text.
const { merge, renderMain, apply } = require('./catalogue-live.js');
const assert = require('assert');
const rows = {
  products: [
    { id: 'tulip', sort: 1, live: true, data: { name: 'Tulip <b>', cat: 'candles', variants: [{ sku: 'BNT-PRD-CG-001', label: '170 g', price: 199 }, { sku: 'BNT-PRD-CG-009', label: '250 g', price: 299 }] } },
    { id: 'chai', sort: 2, live: true, data: { name: 'Chai', cat: 'candles', variants: [{ sku: 'BNT-PRD-CG-002', label: '170 g', price: 169 }] } },
    { id: 'new', sort: 3, live: true, data: { name: 'Lotus tray', cat: 'jesmonite', upcoming: true, variants: [{ sku: 'BNT-PRD-JT-099', label: 'One size', price: 0 }] } },
    { id: 'hide', sort: 4, live: false, data: { name: 'Draft piece', cat: 'candles', variants: [{ sku: 'BNT-PRD-CG-050', label: 'x', price: 100 }] } },
    { id: 'old', sort: 5, live: true, data: { name: 'Old sample', cat: 'candles', variants: [{ sku: 'BT-CN-001', label: 'x', price: 100 }] } },
  ],
  stock: [{ sku: 'BNT-PRD-CG-001', qty: 0 }, { sku: 'BNT-PRD-CG-009', qty: 5 }, { sku: 'BNT-PRD-CG-002', qty: 0 }],
  media: [{ product_id: 'tulip', kind: 'photo', role: 'lifestyle', path: 'tulip/a.jpg', sort: 1, published: true }],
};
const snap = { products: [{ id: 'BNT-PRD-CG-001', name: 'Tulip', price: 199, img: 'bnt-prd-cg-001.jpg', sheetTab: 'Glass Candles' }, { id: 'BNT-PRD-DIY-1', name: 'Pour kit', price: 499, img: '', sheetTab: 'DIY Items' }] };
const list = merge(rows, snap, 'https://x.supabase.co');
const by = (n) => list.find((p) => p.name === n);
assert.strictEqual(by('Tulip <b>').status, 'in'); assert.strictEqual(by('Tulip <b>').price, 199);
assert.ok(by('Tulip <b>').img.includes('/storage/v1/object/public/media/tulip/a.jpg'));
assert.strictEqual(by('Chai').status, 'out');
assert.strictEqual(by('Lotus tray').status, 'upcoming');
assert.ok(!by('Draft piece') && !by('Old sample'), 'drafts stay out');
assert.ok(by('Pour kit') && !by('Tulip'), 'sheet-only piece kept, matched piece not doubled');
const html = apply('<style>a{}</style><main>old</main>', list);
assert.ok(html.includes('Sold out') && html.includes('Coming soon') && html.includes('A new batch is being prepared.'));
assert.ok(!html.includes('<b>') && html.includes('Tulip &lt;b&gt;'), 'names are escaped');
assert.ok(!html.includes('₹0'), 'no zero price');
console.log('Live catalogue checks passed.');
