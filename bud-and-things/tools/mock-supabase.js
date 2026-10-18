// A stand-in for Supabase, for testing the site's database mode without an account. It keeps everything in memory
// and answers the small part of the Supabase HTTP API that prototype/db.js uses (tables, two functions, sign-in and
// file storage), with the same who-may-do-what rules as supabase/schema.sql.
//   node tools/mock-supabase.js            serves on http://localhost:54321
//   owner sign-in: hello@budandthings.com / demo, password only while TWO_STEP is off; with TWO_STEP=1, then the code 123456
// Point the site at it with  window.BT_CONFIG = { supabase: { url: 'http://localhost:54321', anonKey: 'anon' } }  in config.js.
const http = require('http');
const PORT = +process.env.PORT || 54321;
const OWNER = { email: 'hello@budandthings.com', password: 'demo', code: '123456', enrolled: false };
// tokens look like Supabase's (header.payload.signature); only the second step's token ("aal2") may edit
const jwt = (aal) => ['x', Buffer.from(JSON.stringify({ email: OWNER.email, aal })).toString('base64url'), 'sig'].join('.');
const TOKENS = { aal1: jwt('aal1'), aal2: jwt('aal2') };
const TWO_STEP = process.env.TWO_STEP === '1'; // matches ownerTwoStep in config.js; off until launch
const KEYS = { site_text: 'key', settings: 'key', stock: 'sku' };
const T = { products: [], pairings: [], site_text: [], settings: [], stock: [], media: [], orders: [], reviews: [], subscribers: [], restock_requests: [] };
const FILES = {};
let orderNo = 1001;
const uuid = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));

// what a visitor (not signed in) may read and write, as in schema.sql
const canRead = (t, r, own) => own || ({ products: r.live, pairings: r.live, media: r.published, reviews: r.published, site_text: true, settings: true, stock: true }[t] || false);
const canInsert = (t, r, own) => own || (t === 'reviews' && !r.published) || t === 'subscribers' || t === 'restock_requests';

function filter(rows, q) {
  for (const [k, v] of q) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    const m = /^eq\.(.*)$/.exec(v); if (m) rows = rows.filter((r) => String(r[k]) === m[1]);
  }
  const o = q.get('order'); if (o) { const [col, dir] = o.split('.'); rows = rows.slice().sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1)); }
  const l = q.get('limit'); if (l) rows = rows.slice(0, +l);
  return rows;
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body === undefined ? '' : Buffer.isBuffer(body) ? body : typeof body === 'string' && type ? body : JSON.stringify(body));
}
const fail = (res, code, message) => send(res, code, { message });

// place_order, as in schema.sql: the order is rebuilt from the products and settings, so the browser can't set prices
const setting = (k, d) => { const r = T.settings.find((x) => x.key === k); return r ? r.value : d; };
const num = (k, d) => { const v = setting(k, d); return /^\s*-?\d+(\.\d+)?\s*$/.test(String(v)) ? +v : 0; };
function placeOrder(o) {
  const c = o.contact || {}, a = o.address || {}, g = o.gift, bad = (w) => { throw new Error('bad_order:' + w); };
  if (!c.name || c.name.length > 80) bad('name'); if (!/^[6-9]\d{9}$/.test(c.phone || '')) bad('phone');
  if (!a.line1 || !/^[1-9]\d{5}$/.test(a.pin || '') || !a.city || !a.state) bad('address');
  if (!['Cash on delivery', 'UPI ID', 'UPI QR', 'UPI app', 'Card'].includes(o.method)) bad('method');
  if (!Array.isArray(o.items) || !o.items.length || o.items.length > 20) bad('items');
  const items = [], seen = new Set(), candles = [], objects = []; let sub = 0, pieces = 0;
  for (const it of o.items) {
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > num('maxQty', 5)) throw new Error('bad_quantity');
    if (seen.has(it.sku)) bad('items'); seen.add(it.sku);
    const p = T.products.filter((x) => x.live).find((x) => x.data.variants.some((v) => v.sku === it.sku)); if (!p) throw new Error('unknown_item:' + it.sku);
    const v = p.data.variants.find((x) => x.sku === it.sku); const s = T.stock.find((x) => x.sku === it.sku); if (!s || s.qty < it.qty) throw new Error('sold_out:' + it.sku);
    sub += v.price * it.qty; pieces += it.qty; for (let i = 0; i < it.qty; i++) (p.data.cat === 'candles' ? candles : objects).push(v.price);
    items.push({ sku: it.sku, name: p.data.name, label: v.label, price: v.price, qty: it.qty });
  }
  if (pieces > num('maxPieces', 10)) throw new Error('bad_quantity');
  candles.sort((x, y) => y - x); objects.sort((x, y) => y - x); let pair = 0; for (let i = 0; i < Math.min(candles.length, objects.length); i++) pair += candles[i] + objects[i];
  const ritual = Math.round(pair * num('ritualOff', 10) / 100); let code = '', codeOff = 0;
  if (o.code) { if (String(o.code).trim().toUpperCase() !== String(setting('welcomeCode', 'HELLO10')).trim().toUpperCase()) throw new Error('price_changed'); code = String(o.code).trim().toUpperCase(); codeOff = Math.round((sub - ritual) * num('welcomeOff', 10) / 100); }
  const giftOn = !!(g && g.on); const ship = num('freeOver', 1999) > 0 && sub >= num('freeOver', 1999) ? 0 : Math.round(num('shipFee', 99));
  const wrap = giftOn && g.wrap ? Math.round(num('wrapFee', 99)) : 0; const cod = o.method === 'Cash on delivery' ? Math.round(num('codFee', 49)) : 0;
  const total = sub - ritual - codeOff + ship + wrap + cod;
  if (o.sub !== sub || o.total !== total) throw new Error('price_changed');
  items.forEach((it) => { T.stock.find((x) => x.sku === it.sku).qty -= it.qty; });
  const id = 'BT-' + orderNo++ + '-' + Math.random().toString(16).slice(2, 8).toUpperCase().padEnd(6, '0');
  const status = o.method === 'Cash on delivery' ? 'Placed' : 'Awaiting payment';
  const data = { id, placedAt: new Date().toISOString(), method: o.method, items, contact: { name: c.name, phone: c.phone, email: c.email || '' }, address: { line1: a.line1, line2: a.line2 || '', pin: a.pin, city: a.city, state: a.state },
    sub, ritual, code, codeOff, ship, wrap, cod, total, gift: giftOn ? { on: true, wrap: !!g.wrap, name: g.name, phone: g.phone || '', note: g.note || '', date: g.date || '' } : null, optin: !!o.optin };
  T.orders.push({ id, data, status, phone: c.phone, total, method: o.method, created_at: data.placedAt });
  return id;
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE', 'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer,x-upsert' }); return res.end(); }
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const raw = Buffer.concat(chunks); const u = new URL(req.url, 'http://x'); const q = u.searchParams;
    const auth = req.headers.authorization || ''; const own = auth === 'Bearer ' + TOKENS.aal2 || (!TWO_STEP && auth === 'Bearer ' + TOKENS.aal1); const signedIn = own || auth === 'Bearer ' + TOKENS.aal1;
    const json = () => (raw.length ? JSON.parse(raw.toString()) : null);
    try {
      if (u.pathname === '/auth/v1/token') { const b = json(); return b.email === OWNER.email && b.password === OWNER.password ? send(res, 200, { access_token: TOKENS.aal1, token_type: 'bearer' }) : send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' }); }
      if (u.pathname.startsWith('/auth/v1/')) { // the second step: one TOTP factor, code 123456
        if (!signedIn) return send(res, 401, { msg: 'not signed in' });
        if (u.pathname === '/auth/v1/user') return send(res, 200, { email: OWNER.email, factors: [{ id: 'f1', factor_type: 'totp', status: OWNER.enrolled ? 'verified' : 'unverified' }] });
        if (u.pathname === '/auth/v1/factors' && req.method === 'POST') return send(res, 200, { id: 'f1', type: 'totp', totp: { qr_code: 'data:img/svg+xml;utf-8,<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#3A2920"/></svg>', secret: 'MOCKSECRET', uri: 'otpauth://totp/budandthings.com:hello%40budandthings.com?secret=MOCKSECRET&issuer=budandthings.com' } });
        if (u.pathname === '/auth/v1/factors/f1' && req.method === 'DELETE') return send(res, 200, { id: 'f1' });
        if (u.pathname === '/auth/v1/factors/f1/challenge') return send(res, 200, { id: 'c1' });
        if (u.pathname === '/auth/v1/factors/f1/verify') { const b = json(); if (b.code !== OWNER.code) return send(res, 422, { msg: 'Invalid TOTP code entered' }); OWNER.enrolled = true; return send(res, 200, { access_token: TOKENS.aal2, token_type: 'bearer' }); }
        return fail(res, 404, 'no such auth route');
      }
      let m = /^\/storage\/v1\/object\/(public\/)?media\/(.+)$/.exec(u.pathname);
      if (m) {
        const path = decodeURIComponent(m[2]);
        if (req.method === 'GET') return FILES[path] ? send(res, 200, FILES[path].body, FILES[path].type) : fail(res, 404, 'not found');
        if (!own) return fail(res, 403, 'new row violates row-level security policy');
        if (req.method === 'DELETE') { delete FILES[path]; return send(res, 200, [{ name: path }]); }
        FILES[path] = { body: raw, type: req.headers['content-type'] }; return send(res, 200, { Key: 'media/' + path });
      }
      m = /^\/rest\/v1\/rpc\/(\w+)$/.exec(u.pathname);
      if (m && m[1] === 'place_order') { try { return send(res, 200, JSON.stringify(placeOrder(json().o)), 'application/json'); } catch (e) { return fail(res, 400, e.message); } }
      if (m && m[1] === 'get_order') { const a = json(); const o = T.orders.find((x) => x.id === String(a.order_id).trim().toUpperCase() && x.phone === a.phone_no); return send(res, 200, o ? Object.assign({}, o.data, { status: o.status }) : null); }
      if (m && m[1] === 'cancel_order') {
        if (!own) return fail(res, 400, 'not_allowed');
        const o = T.orders.find((x) => x.id === json().order_id); if (!o || !['Awaiting payment', 'Placed', 'Packed'].includes(o.status)) return fail(res, 400, 'cannot_cancel');
        o.data.items.forEach((it) => { const s = T.stock.find((x) => x.sku === it.sku); if (s) s.qty += it.qty; }); o.status = 'Cancelled'; return send(res, 200, null);
      }
      m = /^\/rest\/v1\/(\w+)$/.exec(u.pathname); if (!m || !T[m[1]]) return fail(res, 404, 'no such table');
      const t = m[1], key = KEYS[t] || 'id', now = new Date().toISOString();
      if (req.method === 'GET') return send(res, 200, filter(T[t].filter((r) => canRead(t, r, own)), q));
      if (req.method === 'POST') {
        const rows = [].concat(json()); const upsert = /merge-duplicates/.test(req.headers.prefer || '');
        for (const r of rows) {
          if (!canInsert(t, r, own)) return fail(res, 403, 'new row violates row-level security policy for table "' + t + '"');
          if (key === 'id' && !r.id) r.id = uuid();
          if (!own && t === 'reviews') r.published = false;
          const i = T[t].findIndex((x) => x[key] === r[key]);
          if (i >= 0) { if (!upsert) return fail(res, 409, 'duplicate key'); T[t][i] = Object.assign({}, T[t][i], r, { updated_at: now }); } else T[t].push(Object.assign({ created_at: now }, r));
        }
        return send(res, 201);
      }
      if (!own) return fail(res, 403, 'permission denied');
      const hit = filter(T[t], q);
      if (req.method === 'PATCH') { const p = json(); hit.forEach((r) => Object.assign(r, p)); return send(res, 204); }
      if (req.method === 'DELETE') { T[t] = T[t].filter((r) => !hit.includes(r)); return send(res, 204); }
      fail(res, 405, 'method');
    } catch (e) { fail(res, 500, e.message); }
  });
}).listen(PORT, () => console.log('Mock Supabase on http://localhost:' + PORT + ' · owner: ' + OWNER.email + ' / ' + OWNER.password + ', code ' + OWNER.code));
