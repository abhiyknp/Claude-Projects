// BUD & THINGS · product import. Reads the team's product sheet (an .xlsx file, a Google Sheet link or a .csv) and works
// out what to add or change in the shop's products. Nothing here talks to the database: Owner view shows the preview and
// writes only when the owner presses "Copy to database". The same file runs in the browser and in tools/test-import.js.
//
// Only the product tabs are read: a tab counts as a product tab when its header row has "Product ID / SKU",
// "Product Name" and "Product Type". Costs, recipes, suppliers and orders are never looked at.
(function (root) {
  'use strict';

  // ---------- reading an .xlsx file (a zip of XML files), no library needed ----------
  const utf8 = (u8) => new TextDecoder('utf-8').decode(u8);
  async function inflateRaw(u8) {
    const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); w.write(u8); w.close();
    return new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }
  function zipEntries(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let e = u8.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('This is not an Excel (.xlsx) file. Save the sheet as .xlsx and try again.');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
    for (let i = 0; i < n && dv.getUint32(p, true) === 0x02014b50; i++) {
      const nameLen = dv.getUint16(p + 28, true), extra = dv.getUint16(p + 30, true), comment = dv.getUint16(p + 32, true);
      out[utf8(u8.subarray(p + 46, p + 46 + nameLen))] = { method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), at: dv.getUint32(p + 42, true) };
      p += 46 + nameLen + extra + comment;
    }
    return out;
  }
  async function entryText(u8, ent) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const start = ent.at + 30 + dv.getUint16(ent.at + 26, true) + dv.getUint16(ent.at + 28, true);
    const raw = u8.subarray(start, start + ent.size);
    return utf8(ent.method === 0 ? raw : await inflateRaw(raw));
  }
  const unxml = (s) => String(s).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const attr = (tag, name) => { const m = new RegExp('\\b' + name + '="([^"]*)"').exec(tag); return m ? unxml(m[1]) : ''; };
  const textOf = (xml) => { let s = ''; xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').replace(/<t\b[^>]*>([\s\S]*?)<\/t>/g, (m, t) => { s += unxml(t); return m; }); return s; };
  const colIndex = (ref) => { let n = 0; for (const ch of ref.replace(/[^A-Z]/gi, '').toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

  function sheetRows(xml, shared) {
    const rows = [];
    xml.replace(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g, (m, body) => {
      const r = parseInt(attr(m.slice(0, m.indexOf('>') + 1), 'r'), 10) - 1; const cells = [];
      (body || '').replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (mm, a, inner) => {
        const t = attr(a, 't'); let v = '';
        if (inner) {
          if (t === 'inlineStr') v = textOf(inner);
          else { const x = /<v>([\s\S]*?)<\/v>/.exec(inner); if (x) v = t === 's' ? shared[+x[1]] || '' : t === 'b' ? (x[1] === '1' ? 'TRUE' : 'FALSE') : unxml(x[1]); }
        }
        cells[colIndex(attr(a, 'r'))] = v.trim(); return mm;
      });
      for (let i = 0; i < cells.length; i++) if (cells[i] == null) cells[i] = '';
      rows[r >= 0 ? r : rows.length] = cells; return m;
    });
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    return rows;
  }

  async function readXlsx(buffer) {
    const u8 = new Uint8Array(buffer); const z = zipEntries(u8);
    const need = (n) => { if (!z[n]) throw new Error('This Excel file is missing ' + n + '.'); return entryText(u8, z[n]); };
    const book = await need('xl/workbook.xml'); const rels = await need('xl/_rels/workbook.xml.rels');
    const shared = []; if (z['xl/sharedStrings.xml']) (await entryText(u8, z['xl/sharedStrings.xml'])).replace(/<si\b[^>]*>([\s\S]*?)<\/si>/g, (m, si) => { shared.push(textOf(si).trim()); return m; });
    const target = {}; rels.replace(/<Relationship\b[^>]*>/g, (m) => { target[attr(m, 'Id')] = attr(m, 'Target'); return m; });
    const sheets = []; const refs = [];
    book.replace(/<sheet\b[^>]*>/g, (m) => { refs.push([attr(m, 'name'), attr(m, 'r:id')]); return m; });
    for (const [name, rid] of refs) {
      let t = target[rid] || ''; t = t.replace(/^\//, ''); if (!/^xl\//.test(t)) t = 'xl/' + t;
      if (z[t]) sheets.push({ name, rows: sheetRows(await entryText(u8, z[t]), shared) });
    }
    return sheets;
  }

  // ---------- reading CSV text (a published Google Sheet tab, or a downloaded .csv) ----------
  function parseCsv(text) {
    const rows = []; let row = [], cell = '', q = false; text = String(text).replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell.trim()); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell.trim()); rows.push(row); }
    return rows;
  }

  // a Google Sheet link: a "Publish to web" CSV link is used as it is; a normal share link becomes a CSV export link
  // tab: a tab name, to read that tab of a whole-workbook link
  function googleCsvUrl(link, tab) {
    link = String(link || '').trim(); if (!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(link)) return '';
    if (/\/pub\?/.test(link) || /output=csv/.test(link)) return link.replace(/output=(html|xlsx|pdf)/, 'output=csv');
    const id = (/\/d\/([\w-]+)/.exec(link) || [])[1]; if (!id) return '';
    const gid = (/[#&?]gid=(\d+)/.exec(link) || [])[1];
    return 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:csv&headers=0' + (gid ? '&gid=' + gid : tab ? '&sheet=' + encodeURIComponent(tab) : '');
  }
  // a whole-workbook link has no tab number (gid) and is not a "Publish to web" link, so it is read tab by tab by name
  const isWorkbookLink = (link) => !!googleCsvUrl(link) && !/\/pub\?/.test(link) && !/output=csv/.test(link) && !/[#&?]gid=\d+/.test(link);

  // ---------- turning product tabs into shop products ----------
  const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  const COLS = {
    sku: ['product id / sku', 'product id', 'sku'], name: ['product name', 'name'], type: ['product type', 'type'], scent: ['scent'], colour: ['colour', 'color'],
    weight: ['actual weight (g)', 'weight (g)', 'weight'], pack: ['packaging type'], img: ['primary image link', 'image link'],
    price: ['selling price (₹)', 'selling price', 'price (₹)', 'price'], stock: ['stock', 'opening stock'], show: ['show on website', 'on website'],
    desc: ['short description', 'description', 'one-line description'],
    mrp: ['marketplace price (₹)', 'marketplace price', 'marketplace mrp'], dims: ['dimensions (cm)', 'dimensions', 'package size (cm)', 'package size'], gtin: ['barcode (ean)', 'barcode', 'ean', 'gtin']
  };
  const ID_RE = /^BNT-PRD-([A-Z]{2,4})-(\d{3})$/;
  const CODE_BY_SHEET = [[/glass/, 'CG'], [/mould/, 'MC'], [/tealight/, 'TL'], [/jesmonite|tray|dish/, 'JT'], [/diy/, 'DIY']];
  const CAT = { CG: 'candles', MC: 'candles', TL: 'candles', JT: 'jesmonite', DIY: 'gifts' };
  const ART = { CG: 'jar', MC: 'pillar', TL: 'plate', JT: 'tray', DIY: 'dish' };
  const SWATCH = [['rose gold', '#C99A8B'], ['brown', '#8B6B4A'], ['white', '#F1EBE0'], ['ivory', '#EFE6D4'], ['gold', '#C9A96A'], ['purple', '#8E7BB0'], ['pink', '#E8B4BC'], ['red', '#B8363F'],
    ['blue', '#6E8FB5'], ['green', '#7E9468'], ['yellow', '#E4C45A'], ['orange', '#D98B4A'], ['grey', '#B9B5AE'], ['gray', '#B9B5AE'], ['black', '#3A3532'], ['transp', '#E6E2DA'], ['transper', '#E6E2DA']];

  function findHeader(rows) {
    for (let r = 0; r < Math.min(rows.length, 12); r++) {
      const map = {}; (rows[r] || []).forEach((h, i) => { const k = norm(h); for (const f in COLS) if (map[f] == null && COLS[f].includes(k)) map[f] = i; });
      if (map.sku != null && map.name != null && map.type != null) return { row: r, map };
    }
    return null;
  }
  const num = (s) => { const n = parseFloat(String(s).replace(/[₹,\s]/g, '')); return isFinite(n) ? n : NaN; };
  // "10x10x8", "10 X 10 × 8" or "10*10*8" (centimetres, length x breadth x height) -> { l, b, h }, or null
  function parseDims(s) {
    const m = /^\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:cm)?\s*$/i.exec(String(s == null ? '' : s));
    if (!m) return null; const l = +m[1], b = +m[2], h = +m[3];
    return l > 0 && b > 0 && h > 0 ? { l, b, h } : null;
  }
  // an EAN-8, UPC-A (12), EAN-13 or GTIN-14 with a correct check digit, else ''
  function cleanGtin(s) {
    const v = String(s == null ? '' : s).replace(/[\s-]/g, ''); if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(v)) return '';
    let sum = 0; for (let i = 0; i < v.length - 1; i++) sum += +v[v.length - 2 - i] * (i % 2 === 0 ? 3 : 1);
    return (10 - (sum % 10)) % 10 === +v[v.length - 1] ? v : '';
  }
  const yes = (s) => /^(yes|y|true|1|live|show)$/i.test(String(s).trim());
  const list = (s) => String(s || '').split(/[,;/]/).map((x) => x.trim()).filter((x) => x && !/^n\/?a$/i.test(x));
  const clean = (o) => { Object.keys(o).forEach((k) => { if (o[k] === '' || o[k] == null || (Array.isArray(o[k]) && !o[k].length)) delete o[k]; }); return o; };

  // sheets: [{ name, rows }]   existing: the shop's product rows [{ id, data, sort, live }]   stock: { sku: qty }
  function plan(sheets, existing, stock, opts) {
    opts = opts || {}; existing = existing || []; stock = stock || {};
    const out = { items: [], problems: [], notes: [], tabs: [], suggestions: [] };
    const byId = {}; existing.forEach((r) => { byId[r.id] = r; });
    const skuOwner = {}; existing.forEach((r) => ((r.data || {}).variants || []).forEach((v) => { skuOwner[v.sku] = r.id; }));
    const seen = {}; const used = {};
    const addUsed = (sku) => { const m = ID_RE.exec(sku || ''); if (m) used[m[1]] = Math.max(used[m[1]] || 0, +m[2]); };
    existing.forEach((r) => addUsed((r.data || {}).sku));
    const parsed = [];
    sheets.forEach((sh) => {
      const h = findHeader(sh.rows); if (!h) return; out.tabs.push(sh.name);
      const cell = (row, f) => (h.map[f] == null ? '' : String(row[h.map[f]] == null ? '' : row[h.map[f]]).trim());
      const rows = []; for (let r = h.row + 1; r < sh.rows.length; r++) { const row = sh.rows[r] || []; if (row.some((c) => String(c).trim())) rows.push({ line: r + 1, row }); }
      const tabCode = (CODE_BY_SHEET.find(([re]) => re.test(norm(sh.name))) || [])[1];
      const codes = {}; rows.forEach(({ row }) => { const m = ID_RE.exec(cell(row, 'sku').toUpperCase()); if (m) { codes[m[1]] = (codes[m[1]] || 0) + 1; addUsed(m[0]); } });
      const topCode = Object.keys(codes).sort((a, b) => codes[b] - codes[a])[0] || tabCode;
      parsed.push({ sh, h, cell, rows, topCode });
    });
    parsed.forEach(({ sh, h, cell, rows, topCode }) => {
      rows.forEach(({ line, row }) => {
        const where = sh.name + ', row ' + line; const skuRaw = cell(row, 'sku').toUpperCase().replace(/\s+/g, ''); const name = cell(row, 'name');
        if (!skuRaw && !name) { out.notes.push(where + ': no ID and no name yet, skipped.'); return; }
        if (!skuRaw) {
          const code = topCode || 'XX'; used[code] = (used[code] || 0) + 1; const s = 'BNT-PRD-' + code + '-' + String(used[code]).padStart(3, '0');
          out.suggestions.push({ where, name, id: s }); out.problems.push({ where, msg: name + ' has no Product ID. Suggested: ' + s + '. Type it into the sheet, then import again.' }); return;
        }
        const m = ID_RE.exec(skuRaw);
        if (!m) { out.problems.push({ where, msg: skuRaw + ' is not a valid ID. Use BNT-PRD-CODE-000, with 3 digits, for example BNT-PRD-CG-001.' }); return; }
        if (!name) { out.problems.push({ where, msg: skuRaw + ' has no product name.' }); return; }
        if (seen[skuRaw]) { out.problems.push({ where, msg: skuRaw + ' is already used on ' + seen[skuRaw] + '.' }); return; }
        const id = skuRaw.toLowerCase(); const old = byId[id];
        if (skuOwner[skuRaw] && skuOwner[skuRaw] !== id) { out.problems.push({ where, msg: skuRaw + ' is already an option SKU of another product (' + skuOwner[skuRaw] + ').' }); return; }
        seen[skuRaw] = where;
        const code = m[1]; const type = cell(row, 'type'); const price = Math.round(num(cell(row, 'price'))); const w = Math.round(num(cell(row, 'weight')));
        const colour = cell(row, 'colour'); const sw = SWATCH.find(([k]) => norm(colour).includes(k));
        // marketplace fields: a blank cell leaves what the shop already has; a cell that cannot be read is ignored with a note
        const mrpRaw = cell(row, 'mrp'); const mrp = Math.round(num(mrpRaw)); const dimsRaw = cell(row, 'dims'); const dims = parseDims(dimsRaw); const gtinRaw = cell(row, 'gtin'); const gtin = cleanGtin(gtinRaw);
        if (mrpRaw && !(mrp > 0)) out.notes.push(where + ': the marketplace price "' + mrpRaw + '" is not a number, ignored.');
        if (dimsRaw && !dims) out.notes.push(where + ': the dimensions "' + dimsRaw + '" should look like 10x10x8 (cm), ignored.');
        if (gtinRaw && !gtin) out.notes.push(where + ': the barcode "' + gtinRaw + '" is not a valid EAN/UPC (8, 12, 13 or 14 digits with a correct last digit), ignored.');
        const d = clean({ sku: skuRaw, name, type, cat: CAT[code] || 'candles', line: cell(row, 'desc'), notes: list(cell(row, 'scent')), colour, packaging: cell(row, 'pack'), weight: w > 0 ? w : '', mrpMarket: mrp > 0 ? mrp : '', dims: dims || '', gtin });
        if (!CAT[code]) out.notes.push(where + ': code ' + code + ' is new, so it was put under Candles. Change it in Products if needed.');
        const hasPrice = price > 0; const wantLive = h.map.show != null && yes(cell(row, 'show'));
        if (hasPrice) d.variants = [{ sku: skuRaw, label: w > 0 ? w + ' g' : 'Standard', price }];
        const nw = Object.assign({ gift: true, art: ART[code] || 'jar', c: sw ? sw[1] : '#DCC9AE', care: [], mood: [], space: [], occ: [] }, old ? old.data : {}, d);
        if (!nw.variants) nw.variants = [];
        if (old) nw.name = d.name;
        const canLive = hasPrice || (nw.variants || []).some((v) => v.price > 0);
        const isNew = !old; let finalLive;
        if (isNew) finalLive = wantLive && hasPrice; else if (h.map.show != null) finalLive = wantLive && canLive; else finalLive = old.live !== false;
        const why = !canLive ? 'no selling price yet' : h.map.show == null ? 'the sheet has no "Show on website" column' : 'Show on website is not Yes';
        const qty = parseInt(cell(row, 'stock'), 10); const skuQty = {};
        if (isFinite(qty) && qty >= 0) (nw.variants || []).forEach((v) => { skuQty[v.sku] = qty; });
        const image = /^https:\/\//i.test(cell(row, 'img')) ? cell(row, 'img') : '';
        if (cell(row, 'img') && !image) out.notes.push(where + ': the image link must start with https://, ignored.');
        const changed = isNew || JSON.stringify(old.data) !== JSON.stringify(nw) || (old.live !== false) !== finalLive;
        out.items.push({ id, sku: skuRaw, where, name, cat: nw.cat, isNew, changed, live: finalLive, hiddenBecause: finalLive ? '' : why, data: nw, sort: old ? old.sort : 1000 + out.items.length * 10, skuQty, image, price: hasPrice ? price : 0 });
      });
    });
    if (!parsed.length) out.problems.push({ where: 'File', msg: 'No product tab found. A product tab needs the headings Product ID / SKU, Product Name and Product Type.' });
    out.counts = { added: out.items.filter((i) => i.isNew).length, changed: out.items.filter((i) => !i.isNew && i.changed).length, same: out.items.filter((i) => !i.isNew && !i.changed).length, live: out.items.filter((i) => i.live).length, hidden: out.items.filter((i) => !i.live).length, problems: out.problems.length };
    return out;
  }

  const api = { readXlsx, parseCsv, googleCsvUrl, isWorkbookLink, plan, findHeader, parseDims, cleanGtin };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BTImport = api;
})(typeof window !== 'undefined' ? window : globalThis);
