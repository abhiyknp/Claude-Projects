// Tests prototype/import.js: the sheet reader and the add / change / skip rules.
//   node bud-and-things/tools/test-import.js                (built-in CSV cases)
//   node bud-and-things/tools/test-import.js workbook.xlsx   (also reads that workbook and prints what would happen)
const fs = require('fs'), path = require('path'), assert = require('assert');
const imp = require(path.join(__dirname, '..', 'prototype', 'import.js'));
const HEAD = 'Product Image (Temporary),Sr. No.,Product ID / SKU,Product Name,Product Type,Scent,Colour,Actual Weight (g),Primary Image Link,Selling Price (₹),Stock,Show on website';
const csv = (rows) => imp.parseCsv([HEAD].concat(rows).join('\n'));
const run = (rows, existing, stock) => imp.plan([{ name: 'Glass Candles', rows: csv(rows) }], existing, stock);

(async () => {
  // csv quoting
  assert.deepStrictEqual(imp.parseCsv('a,"b,c","d ""x"""\r\n1,2,3'), [['a', 'b,c', 'd "x"'], ['1', '2', '3']]);
  // google links
  assert.strictEqual(imp.googleCsvUrl('https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=0&single=true&output=html'), 'https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=0&single=true&output=csv');
  assert.ok(/gviz\/tq\?tqx=out:csv&headers=0&gid=5$/.test(imp.googleCsvUrl('https://docs.google.com/spreadsheets/d/AbC_1-2/edit#gid=5')));
  assert.strictEqual(imp.googleCsvUrl('https://example.com/x'), '');
  assert.ok(/&sheet=Glass%20Candles$/.test(imp.googleCsvUrl('https://docs.google.com/spreadsheets/d/AbC_1-2/edit?usp=sharing', 'Glass Candles')));
  assert.ok(imp.isWorkbookLink('https://docs.google.com/spreadsheets/d/AbC_1-2/edit?usp=sharing'));
  assert.ok(!imp.isWorkbookLink('https://docs.google.com/spreadsheets/d/AbC_1-2/edit#gid=5'));
  assert.ok(!imp.isWorkbookLink('https://docs.google.com/spreadsheets/d/e/2PACX-abc/pub?gid=0&single=true&output=csv'));

  // a good row, a hidden row, rows with problems
  let p = run([',1,BNT-PRD-CG-001,Iced Latte,Glass candle,Coffee,Brown + White,200,https://res.cloudinary.com/x/a.jpg,799,12,Yes',
    ',2,BNT-PRD-CG-002,Vanilla Gold,Glass candle,Vanilla,White + Gold,,,,,',
    ',3,,Berry Blast,Glass candle,Berries,,,,,,',
    ',4,BNT-PRD-CG-00000004,Long Id,Glass candle,,,,,,,',
    ',5,BNT-PRD-CG-001,Dup,Glass candle,,,,,,,',
    ',6,,,Glass candle,,,,,,,'], [], {});
  assert.strictEqual(p.items.length, 2);
  const a = p.items[0]; assert.strictEqual(a.id, 'bnt-prd-cg-001'); assert.strictEqual(a.live, true); assert.strictEqual(a.cat, 'candles');
  assert.deepStrictEqual(a.data.variants, [{ sku: 'BNT-PRD-CG-001', label: '200 g', price: 799 }]); assert.deepStrictEqual(a.skuQty, { 'BNT-PRD-CG-001': 12 });
  assert.strictEqual(a.image, 'https://res.cloudinary.com/x/a.jpg'); assert.deepStrictEqual(a.data.notes, ['Coffee']);
  const b = p.items[1]; assert.strictEqual(b.live, false); assert.strictEqual(b.hiddenBecause, 'no selling price yet'); assert.deepStrictEqual(b.data.variants, []);
  assert.strictEqual(p.problems.length, 3); assert.ok(/Suggested: BNT-PRD-CG-003/.test(p.problems[0].msg)); assert.ok(/3 digits/.test(p.problems[1].msg)); assert.ok(/already used/.test(p.problems[2].msg));

  // running again changes nothing; a new price changes only the price and keeps what the owner wrote in the shop
  const existing = p.items.map((i) => ({ id: i.id, data: JSON.parse(JSON.stringify(i.data)), sort: i.sort, live: i.live }));
  existing[0].data.care = ['Trim the wick.'];
  p = run([',1,BNT-PRD-CG-001,Iced Latte,Glass candle,Coffee,Brown + White,200,,799,12,Yes'], existing, {});
  assert.strictEqual(p.counts.same, 1); assert.deepStrictEqual(p.items[0].data.care, ['Trim the wick.']);
  p = run([',1,BNT-PRD-CG-001,Iced Latte,Glass candle,Coffee,Brown + White,200,,849,12,No'], existing, {});
  assert.strictEqual(p.counts.changed, 1); assert.strictEqual(p.items[0].data.variants[0].price, 849); assert.strictEqual(p.items[0].live, false);
  // an option SKU used by another product is refused
  p = run([',1,BNT-PRD-CG-009,Clash,Glass candle,,,,,500,,Yes'], [{ id: 'other', data: { variants: [{ sku: 'BNT-PRD-CG-009', label: 'x', price: 1 }] }, sort: 0, live: true }], {});
  assert.strictEqual(p.items.length, 0); assert.ok(/another product/.test(p.problems[0].msg));
  // tabs without the three product headings are ignored
  p = imp.plan([{ name: 'Recipe', rows: [['Recipe Line ID', 'Product ID / SKU', 'Product Name']] }], [], {});
  assert.strictEqual(p.tabs.length, 0); assert.ok(/No product tab/.test(p.problems[0].msg));
  // marketplace columns: price, dimensions, barcode. Blank keeps what the shop has; bad values are ignored with a note
  assert.deepStrictEqual(imp.parseDims('10x10x8'), { l: 10, b: 10, h: 8 }); assert.deepStrictEqual(imp.parseDims(' 12.5 X 8 × 6 cm'), { l: 12.5, b: 8, h: 6 }); assert.deepStrictEqual(imp.parseDims('10*10*8'), { l: 10, b: 10, h: 8 });
  assert.strictEqual(imp.parseDims('10x10'), null); assert.strictEqual(imp.parseDims('0x1x1'), null); assert.strictEqual(imp.parseDims(''), null);
  assert.strictEqual(imp.cleanGtin('4006381333931'), '4006381333931'); assert.strictEqual(imp.cleanGtin('4006 3813 33931'), '4006381333931'); assert.strictEqual(imp.cleanGtin('036000291452'), '036000291452');
  assert.strictEqual(imp.cleanGtin('4006381333932'), ''); assert.strictEqual(imp.cleanGtin('12345'), ''); assert.strictEqual(imp.cleanGtin('abc'), '');
  const MH = HEAD + ',Marketplace Price (₹),Dimensions (cm),Barcode (EAN)';
  const mrun = (rows, existing) => imp.plan([{ name: 'Glass Candles', rows: imp.parseCsv([MH].concat(rows).join('\n')) }], existing || [], {});
  p = mrun([',1,BNT-PRD-CG-001,Iced Latte,Glass candle,Coffee,Brown,200,,799,12,Yes,899,10x10x8,4006381333931']);
  assert.strictEqual(p.items[0].data.mrpMarket, 899); assert.deepStrictEqual(p.items[0].data.dims, { l: 10, b: 10, h: 8 }); assert.strictEqual(p.items[0].data.gtin, '4006381333931'); assert.strictEqual(p.notes.length, 0);
  // blank cells keep what the shop already has; the site price is not touched
  const ex = [{ id: p.items[0].id, data: JSON.parse(JSON.stringify(p.items[0].data)), sort: 1000, live: true }];
  p = mrun([',1,BNT-PRD-CG-001,Iced Latte,Glass candle,Coffee,Brown,200,,799,12,Yes,,,'], ex);
  assert.strictEqual(p.items[0].data.mrpMarket, 899); assert.deepStrictEqual(p.items[0].data.dims, { l: 10, b: 10, h: 8 }); assert.strictEqual(p.items[0].data.gtin, '4006381333931'); assert.strictEqual(p.counts.same, 1);
  p = mrun([',1,BNT-PRD-CG-001,Iced Latte,Glass candle,Coffee,Brown,200,,799,12,Yes,949,12x12x9,'], ex);
  assert.strictEqual(p.counts.changed, 1); assert.strictEqual(p.items[0].data.mrpMarket, 949); assert.strictEqual(p.items[0].data.variants[0].price, 799);
  // unreadable values are ignored and explained, never saved
  p = mrun([',1,BNT-PRD-CG-002,Vanilla,Glass candle,,,,,500,,Yes,abc,10x10,123']);
  assert.ok(!('mrpMarket' in p.items[0].data) && !('dims' in p.items[0].data) && !('gtin' in p.items[0].data)); assert.strictEqual(p.notes.length, 3);
  // sheets without the new columns still import exactly as before
  p = run([',1,BNT-PRD-CG-001,Iced Latte,Glass candle,Coffee,Brown,200,,799,12,Yes'], [], {}); assert.ok(!('mrpMarket' in p.items[0].data));
  console.log('Import checks passed.');

  const file = process.argv[2];
  if (file) {
    const sheets = await imp.readXlsx(fs.readFileSync(file));
    const r = imp.plan(sheets, [], {});
    console.log('Tabs read: ' + r.tabs.join(', ') + ' (of ' + sheets.length + ' tabs in the file)');
    console.log(JSON.stringify(r.counts));
    r.items.forEach((i) => console.log('  ' + i.sku + ' · ' + i.name + ' · ' + i.cat + ' · ' + (i.live ? 'live' : 'draft (' + i.hiddenBecause + ')')));
    r.problems.forEach((x) => console.log('  PROBLEM ' + x.where + ': ' + x.msg));
    r.notes.forEach((x) => console.log('  note ' + x));
  }
})().catch((e) => { console.error(e); process.exit(1); });
