// A stand-in for Supabase, for testing the site's database mode without an account. It keeps everything in memory
// and answers the small part of the Supabase HTTP API that prototype/db.js uses (tables, functions, sign-in and
// file storage, customer sign-in by emailed code: always 111111), with the same who-may-do-what rules as supabase/schema.sql.
// The pay and delivery Edge Functions are stood in for too: a payment is accepted at once, and every PIN code is reachable.
//   node tools/mock-supabase.js            serves on http://localhost:54321
//   owner sign-in: hello@budandthings.com / demo, password only while TWO_STEP is off; with TWO_STEP=1, then the code 123456
// Point the site at it with  window.BT_CONFIG = { supabase: { url: 'http://localhost:54321', anonKey: 'anon' } }  in config.js.
const http = require('http');
const PORT = +process.env.PORT || 54321;
const OWNER = { email: 'hello@budandthings.com', password: 'demo', code: '123456', enrolled: false };
// tokens look like Supabase's (header.payload.signature); only the second step's token ("aal2") may edit
const jwt = (aal) => ['x', Buffer.from(JSON.stringify({ email: OWNER.email, aal })).toString('base64url'), 'sig'].join('.');
const TOKENS = { aal1: jwt('aal1'), aal2: jwt('aal2') };
// customers: any email; the emailed code is always 111111. Their token carries their email, as Supabase's does.
const custJwt = (email) => ['x', Buffer.from(JSON.stringify({ email, role: 'authenticated', customer: true })).toString('base64url'), 'sig'].join('.');
const custOf = (auth) => { try { const p = JSON.parse(Buffer.from(auth.replace(/^Bearer /, '').split('.')[1], 'base64url').toString()); return p.customer ? String(p.email).toLowerCase() : null; } catch (e) { return null; } };
const CUST_CODE = '111111';
const custSession = (email) => ({ access_token: custJwt(email), refresh_token: 'r.' + Buffer.from(email).toString('base64url'), expires_in: 3600, token_type: 'bearer', user: { email } });
const TWO_STEP = process.env.TWO_STEP === '1'; // matches ownerTwoStep in config.js; off until launch
const KEYS = { site_text: 'key', settings: 'key', stock: 'sku', coupons: 'code', invoices: 'id', customer_meta: 'contact', review_authors: 'review_id' };
const T = { coupons: [{ code: 'HELLO10', kind: 'percent', amount: 10, min_order: 0, max_off: 0, starts_on: null, ends_on: null, max_uses: 0, per_customer: 0, first_order_only: false, tag: 'welcome', featured: true, active: true, created_at: new Date().toISOString() }], invoices: [], points_log: [], products: [], pairings: [], site_text: [], settings: [], stock: [], media: [], orders: [], reviews: [], subscribers: [], restock_requests: [], reminders: [], gift_cards: [], referrers: [], review_authors: [], customer_meta: [], events: [], notifications: [], profiles: [] };
const FILES = {};
let orderNo = 1001;
const uuid = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16));

// what a visitor (not signed in) may read and write, as in schema.sql
const canRead = (t, r, own) => own || ({ products: r.live, pairings: r.live, media: r.published, reviews: r.published, site_text: true, settings: true, stock: true }[t] || false);
const canInsert = (t, r, own) => (own && !['invoices', 'review_authors', 'events'].includes(t)) || (t === 'reviews' && !r.published) || t === 'subscribers' || t === 'restock_requests' || t === 'reminders' || (t === 'events' && !own);

function filter(rows, q) {
  for (const [k, v] of q) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    const m = /^eq\.(.*)$/.exec(v); if (m) rows = rows.filter((r) => String(r[k]) === m[1]);
    const n = /^in\.\((.*)\)$/.exec(v); if (n) { const set = n[1].split(','); rows = rows.filter((r) => set.includes(String(r[k]))); }
  }
  const o = q.get('order'); if (o) { const [col, dir] = o.split('.'); rows = rows.slice().sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1)); }
  const l = q.get('limit'); if (l) rows = rows.slice(0, +l);
  return rows;
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body === undefined ? '' : Buffer.isBuffer(body) ? body : typeof body === 'string' && type ? body : JSON.stringify(body));
}
// norm_phone() in schema.sql: +91 and 10 digits
const normPhone = (p) => { const t = String(p || '').trim(); const d = t.replace(/\D/g, ''); if (t.startsWith('+')) return d.startsWith('91') ? (/^91[6-9]\d{9}$/.test(d) ? '+' + d : null) : /^[1-9]\d{6,14}$/.test(d) ? '+' + d : null; const n = d.replace(/^(91|0)(?=[6-9]\d{9}$)/, ''); return /^[6-9]\d{9}$/.test(n) ? '+91' + n : null; };
const normContact = (c) => { const v = String(c || '').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : normPhone(c); };
const fail = (res, code, message) => send(res, code, { message });

// place_order, as in schema.sql: the order is rebuilt from the products and settings, so the browser can't set prices
const setting = (k, d) => { const r = T.settings.find((x) => x.key === k); return r ? r.value : d; };
const num = (k, d) => { const v = setting(k, d); return /^\s*-?\d+(\.\d+)?\s*$/.test(String(v)) ? +v : 0; };
// Bud Points, as points_of() in schema.sql
function pointsOf(em) {
  const mine = T.orders.filter((x) => x.data.email === em); const sum = (f) => mine.reduce((a, x) => a + f(x), 0);
  const adj = T.points_log.filter((x) => x.email === em).reduce((a, x) => a + x.delta, 0);
  return { available: Math.max(0, sum((x) => (x.status === 'Delivered' ? x.data.points || 0 : 0)) - sum((x) => (x.status !== 'Cancelled' ? x.data.pointsUsed || 0 : 0)) + adj),
    pending: sum((x) => (['Placed', 'Packed', 'Shipped'].includes(x.status) ? x.data.points || 0 : 0)) };
}
// coupon_off() in schema.sql: what a code takes off, or the reason it can't be used
function couponOff(codeIn, base, em) {
  const code = String(codeIn || '').trim().toUpperCase(); const c = T.coupons.find((x) => x.code === code); if (!c || !c.active) throw new Error('bad_code');
  const today = new Date().toISOString().slice(0, 10); if (c.starts_on && today < c.starts_on) throw new Error('coupon_early'); if (c.ends_on && today > c.ends_on) throw new Error('coupon_ended');
  const used = T.orders.filter((x) => x.data.code === c.code && x.status !== 'Cancelled'); if (c.max_uses > 0 && used.length >= c.max_uses) throw new Error('coupon_used_up');
  if (base < c.min_order) throw new Error('coupon_min:' + c.min_order);
  if (em) { const mine = T.orders.filter((x) => x.data.email === em && x.status !== 'Cancelled'); if (c.first_order_only && mine.length) throw new Error('coupon_first'); if (c.per_customer > 0 && mine.filter((x) => x.data.code === c.code).length >= c.per_customer) throw new Error('coupon_per_customer'); }
  let off = c.kind === 'percent' ? Math.round(base * c.amount / 100) : Math.min(c.amount, base); if (c.max_off > 0) off = Math.min(off, c.max_off);
  return { code: c.code, kind: c.kind, amount: c.amount, min_order: c.min_order, max_off: c.max_off, off };
}
// make_invoice() and auto_invoice() in schema.sql, with a plain bill of supply (the real tax maths is tested against Postgres)
function mockSnap(o) {
  const d = o.data; const disc = ((d.ritual || 0) + (d.codeOff || 0) + (d.pointsUsed || 0)) * 100; const lines = d.items.map((l) => ({ name: l.name + (l.label ? ' · ' + l.label : ''), qty: l.qty, hsn: '', rate: 0, gross: l.price * l.qty * 100, disc: 0 }));
  let left = disc; const gsum = lines.reduce((a, l) => a + l.gross, 0) || 1; lines.forEach((l, i) => { l.disc = i === lines.length - 1 ? left : Math.min(left, Math.floor(disc * l.gross / gsum)); left -= l.disc; });
  [['Shipping', d.ship], ['Gift wrap', d.wrap], ['Cash on delivery fee', d.cod]].forEach(([name, v]) => { if (v > 0) lines.push({ name, qty: 1, hsn: '', rate: 0, gross: v * 100, disc: 0 }); });
  lines.forEach((l) => { l.net = l.gross - l.disc; l.taxable = l.net; l.cgst = l.sgst = l.igst = 0; });
  const total = lines.reduce((a, l) => a + l.net, 0); const a = d.address || {}, c = d.contact || {};
  return { gst: false, inter: false, placeOfSupply: a.state || '', orderId: o.id, orderDate: d.placedAt, method: d.method, lines, totals: { discount: disc, taxable: total, cgst: 0, sgst: 0, igst: 0, total }, seller: { name: 'BUD & THINGS', address: '', gstin: '', email: '' },
    buyer: { name: c.name || '', phone: c.phone || '', email: c.email || '', line1: a.line1 || '', line2: a.line2 || '', city: a.city || '', pin: a.pin || '', state: a.state || '' } };
}
function mkInvoice(o, kind, against, reason) {
  if (kind === 'invoice') { if (['Awaiting payment', 'Cancelled'].includes(o.status)) throw new Error('not_ready'); if (T.invoices.some((x) => x.order_id === o.id && x.kind === 'invoice' && x.status === 'Issued')) throw new Error('already_invoiced'); }
  else { if (!T.invoices.some((x) => x.id === against && x.kind === 'invoice' && x.status === 'Issued')) throw new Error('no_invoice'); if (!reason) throw new Error('bad_invoice'); if (T.invoices.some((x) => x.against === against && x.kind === 'credit_note' && x.status === 'Issued')) throw new Error('already_credited'); }
  const d = new Date(); const yy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; const fy = String(yy % 100).padStart(2, '0') + '-' + String((yy + 1) % 100).padStart(2, '0');
  const seq = T.invoices.filter((x) => x.kind === kind && x.fy === fy).length + 1; const pre = String(setting('invoicePrefix', 'BT')).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3) || 'BT';
  const id = kind === 'invoice' ? pre + '/' + fy + '/' + String(seq).padStart(4, '0') : pre + 'CN/' + fy + '/' + String(seq).padStart(4, '0');
  const snap = Object.assign(mockSnap(o), kind === 'credit_note' ? { reason, against } : {});
  const row = { id, kind, order_id: o.id, fy, seq, against: kind === 'credit_note' ? against : null, status: 'Issued', void_reason: null, voided_at: null, data: Object.assign(snap, { number: id, date: d.toISOString().slice(0, 10) }), created_at: d.toISOString() };
  T.invoices.push(row); return row;
}
function autoInvoice(o, was) {
  if (setting('invoiceAuto', true) === false) return;
  try {
    if (['Placed', 'Packed', 'Shipped', 'Delivered'].includes(o.status) && was !== o.status && !T.invoices.some((x) => x.order_id === o.id && x.kind === 'invoice')) mkInvoice(o, 'invoice');
    else if (o.status === 'Cancelled' && was !== o.status) { const i = T.invoices.find((x) => x.order_id === o.id && x.kind === 'invoice' && x.status === 'Issued'); if (i) mkInvoice(o, 'credit_note', i.id, 'Order cancelled'); }
  } catch (e) { /* skipped, as in the database */ }
}
function placeOrder(o, em) {
  if (!em) throw new Error('sign_in');
  const c = o.contact || {}, a = o.address || {}, g = o.gift, bad = (w) => { throw new Error('bad_order:' + w); };
  if (!c.name || c.name.length > 80) bad('name'); if (!normPhone(c.phone)) bad('phone'); c.phone = normPhone(c.phone);
  if (!a.line1 || !/^[1-9]\d{5}$/.test(a.pin || '') || !a.city || !a.state) bad('address');
  if (!['Online', 'UPI QR', 'Gift card or points', 'Cash on delivery'].includes(o.method)) bad('method');
  if (o.method === 'UPI QR' && !(setting('upiQrOn', false) && /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/.test(String(setting('upiId', ''))))) bad('upi_off');
  if (o.method === 'Cash on delivery' && !setting('codOn', false)) bad('cod_off');
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
  if (o.code) { const cp = couponOff(o.code, sub - ritual, em); code = cp.code; codeOff = cp.off; }
  const giftOn = !!(g && g.on); const ship = num('freeOver', 1999) > 0 && sub >= num('freeOver', 1999) ? 0 : Math.round(num('shipFee', 99));
  const wrap = giftOn && g.wrap ? Math.round(num('wrapFee', 99)) : 0; const cod = o.method === 'Cash on delivery' ? Math.round(num('codFee', 49)) : 0;
  if (!/^\d{1,6}$/.test(String(o.usePoints == null ? 0 : o.usePoints))) bad('points'); const usePts = +(o.usePoints || 0);
  if (usePts > 0 && (usePts > pointsOf(em).available || usePts > sub - ritual - codeOff)) throw new Error('points_changed');
  let total = sub - ritual - codeOff - usePts + ship + wrap + cod; const earned = Math.floor((total - ship - wrap - cod) * Math.max(num('rewardPct', 5), 0) / 100);
  // a gift card pays what its balance covers; an order through a share link is credited to the friend, never to yourself
  const card = String(o.card || '').trim().toUpperCase(); let cardOff = 0; const gc = card && T.gift_cards.find((x) => x.code === card);
  if (card) { if (!gc || gc.balance <= 0) throw new Error('bad_card'); cardOff = Math.min(gc.balance, total); total -= cardOff; }
  const rf = T.referrers.find((x) => x.id === o.ref && x.contact !== c.phone && x.contact !== em); const ref = rf ? rf.id : null;
  if ((o.method === 'Gift card or points') !== (total === 0)) throw new Error('price_changed');
  if (o.sub !== sub || o.total !== total) throw new Error('price_changed');
  if (gc) gc.balance -= cardOff;
  items.forEach((it) => { T.stock.find((x) => x.sku === it.sku).qty -= it.qty; });
  const id = 'BT-' + orderNo++ + '-' + Math.random().toString(16).slice(2, 8).toUpperCase().padEnd(6, '0');
  const status = o.method === 'Online' || o.method === 'UPI QR' ? 'Awaiting payment' : 'Placed';
  const data = { id, placedAt: new Date().toISOString(), method: o.method, items, email: em, contact: { name: c.name, phone: c.phone, email: em }, address: { line1: a.line1, line2: a.line2 || '', pin: a.pin, city: a.city, state: a.state },
    sub, ritual, code, codeOff, pointsUsed: usePts, points: earned, ship, wrap, cod, total, gift: giftOn ? { on: true, wrap: !!g.wrap, name: g.name, phone: g.phone || '', note: g.note || '', date: g.date || '' } : null, optin: !!o.optin, card: card || null, cardOff, ref };
  const row = { id, data, status, phone: c.phone, total, method: o.method, created_at: data.placedAt }; T.orders.push(row); autoInvoice(row, null);
  let pr = T.profiles.find((x) => x.email === em); if (!pr) T.profiles.push(pr = { email: em, name: '', phone: '', addresses: [], prefs: {} });
  if (!pr.name) pr.name = c.name; if (!pr.phone) pr.phone = c.phone;
  if (!(g && g.on) && pr.addresses.length < 5 && !pr.addresses.some((x) => x.line1.toLowerCase() === a.line1.trim().toLowerCase() && x.pin === a.pin)) pr.addresses.push({ label: '', line1: a.line1.trim(), line2: a.line2 || '', pin: a.pin, city: a.city, state: a.state });
  return id;
}

// event_stats() in schema.sql
function eventStats(days) {
  const since = Date.now() - days * 864e5; const e = T.events.filter((x) => new Date(x.created_at) >= since); const ses = {};
  e.forEach((x) => { if (!x.sid) return; const s = ses[x.sid] = ses[x.sid] || { src: x.src, viewed: false, added: false, checkout: false, bought: false }; if (x.name === 'product_view') s.viewed = true; if (['add_to_cart', 'ritual_add', 'combo_add'].includes(x.name)) s.added = true; if (x.name === 'checkout_start') s.checkout = true; if (x.name === 'purchase') s.bought = true; });
  const S = Object.values(ses); const count = (arr, f) => arr.reduce((m, x) => { const k = f(x); if (k != null) m[k] = (m[k] || 0) + 1; return m; }, {});
  const daily = {}; e.forEach((x) => { const d = x.created_at.slice(0, 10); daily[d] = daily[d] || { v: new Set(), s: new Set() }; daily[d].v.add(x.vid); daily[d].s.add(x.sid); });
  const src = {}; S.forEach((s) => { const k = s.src || 'direct'; src[k] = src[k] || { src: k, sessions: 0, bought: 0 }; src[k].sessions++; if (s.bought) src[k].bought++; });
  const names = ['wa_click', 'finder_complete', 'filter', 'house_focus', 'house_mood', 'walk_skip', 'walk_shop', 'share', 'pin_check', 'payment_failed', 'search', 'search_no_results']; const detail = {};
  names.forEach((n) => { const g = count(e.filter((x) => x.name === n), (x) => JSON.stringify(x.data)); const v = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, c]) => ({ data: JSON.parse(k), n: c })); if (v.length) detail[n] = v; });
  return { visitors: new Set(e.map((x) => x.vid)).size, sessions: S.length, funnel: { visits: S.length, viewed: S.filter((s) => s.viewed).length, added: S.filter((s) => s.added).length, checkout: S.filter((s) => s.checkout).length, bought: S.filter((s) => s.bought).length },
    daily: Object.keys(daily).sort().map((d) => ({ d, visitors: daily[d].v.size, sessions: daily[d].s.size })), sources: Object.values(src).sort((a, b) => b.sessions - a.sessions), names: count(e, (x) => x.name),
    views: count(e.filter((x) => x.name === 'product_view'), (x) => x.data.id), adds: count(e.filter((x) => x.name === 'add_to_cart'), (x) => x.data.sku), pages: count(e.filter((x) => x.name === 'page_view'), (x) => x.page || 'home'), detail };
}
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE', 'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer,x-upsert' }); return res.end(); }
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const raw = Buffer.concat(chunks); const u = new URL(req.url, 'http://x'); const q = u.searchParams;
    const auth = req.headers.authorization || ''; const own = auth === 'Bearer ' + TOKENS.aal2 || (!TWO_STEP && auth === 'Bearer ' + TOKENS.aal1); const signedIn = own || auth === 'Bearer ' + TOKENS.aal1;
    const json = () => (raw.length ? JSON.parse(raw.toString()) : null);
    try {
      if (u.pathname === '/auth/v1/otp') { const b = json(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || '') ? send(res, 200, {}) : send(res, 400, { msg: 'Unable to validate email address' }); }
      if (u.pathname === '/auth/v1/verify') { const b = json(); return b.token === CUST_CODE ? send(res, 200, custSession(String(b.email).toLowerCase())) : send(res, 403, { msg: 'Token has expired or is invalid' }); }
      if (u.pathname === '/auth/v1/logout') return send(res, 204);
      if (u.pathname === '/auth/v1/token' && q.get('grant_type') === 'refresh_token') { const b = json(); try { return send(res, 200, custSession(Buffer.from(String(b.refresh_token).slice(2), 'base64url').toString())); } catch (e) { return send(res, 400, { error: 'invalid_grant' }); } }
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
      if (m && m[1] === 'place_order') { try { return send(res, 200, JSON.stringify(placeOrder(json().o, custOf(auth))), 'application/json'); } catch (e) { return fail(res, 400, e.message); } }
      if (m && m[1] === 'my_orders') { const em = custOf(auth); if (!em) return fail(res, 400, 'sign_in'); return send(res, 200, { points: pointsOf(em), orders: T.orders.filter((x) => x.data.email === em).slice().reverse().slice(0, 50).map((x) => Object.assign({}, x.data, { status: x.status })) }); }
      // "Download my data", as export_my_data in schema.sql: this customer's own records only
      if (m && m[1] === 'export_my_data') {
        const em = custOf(auth); if (!em) return fail(res, 400, 'sign_in');
        const p = T.profiles.find((x) => x.email === em);
        return send(res, 200, { email: em, exported_at: new Date().toISOString(), profile: p ? { name: p.name, phone: p.phone, addresses: p.addresses, prefs: p.prefs } : null,
          orders: T.orders.filter((x) => x.data.email === em).map((x) => Object.assign({}, x.data, { status: x.status })), bud_points_adjustments: [], reviews: [], sign_ups: [], restock_requests: [], gift_reminders: [] });
      }
      // profiles, as my_profile / save_profile / forget_me in schema.sql
      if (m && ['my_profile', 'save_profile', 'forget_me'].includes(m[1])) {
        const em = custOf(auth); if (!em) return fail(res, 400, 'sign_in');
        let p = T.profiles.find((x) => x.email === em);
        if (!p) { const last = T.orders.filter((x) => x.data.email === em).pop(); p = { email: em, name: last ? last.data.contact.name : '', phone: last ? last.phone : '', addresses: [], prefs: {} }; T.profiles.push(p); }
        if (m[1] === 'forget_me') { Object.assign(p, { name: '', phone: '', addresses: [], prefs: {} }); return send(res, 200, null); }
        if (m[1] === 'save_profile') {
          const b = json().p, bad = (w) => { throw new Error('bad_profile:' + w); };
          try {
            if (String(b.name || '').length > 80) bad('name'); if (b.phone && !normPhone(b.phone)) bad('phone'); b.phone = b.phone ? normPhone(b.phone) : '';
            if (!Array.isArray(b.addresses || []) || (b.addresses || []).length > 5) bad('address');
            (b.addresses || []).forEach((a) => { if (!a.line1 || !/^[1-9]\d{5}$/.test(a.pin || '') || !a.city || !a.state) bad('address'); });
            Object.keys(b.prefs || {}).forEach((k) => { if (!['whatsapp', 'sms', 'push'].includes(k) || typeof b.prefs[k] !== 'boolean') bad('prefs'); });
          } catch (e) { return fail(res, 400, e.message); }
          Object.assign(p, { name: String(b.name || '').trim(), phone: b.phone || '', addresses: (b.addresses || []).map((a) => ({ label: a.label || '', line1: a.line1, line2: a.line2 || '', pin: a.pin, city: a.city, state: a.state })), prefs: b.prefs || {} });
        }
        return send(res, 200, p);
      }
      // event_stats and forget_customer, as in schema.sql (owner only)
      if (m && m[1] === 'event_stats') { if (!own) return fail(res, 400, 'not_allowed'); return send(res, 200, eventStats(Math.min(Math.max(+json().days || 30, 1), 400))); }
      if (m && m[1] === 'forget_customer') {
        if (!own) return fail(res, 400, 'not_allowed'); const c = (json().contacts || []).map((x) => String(x).trim().toLowerCase());
        ['subscribers', 'restock_requests', 'reminders', 'customer_meta', 'referrers'].forEach((t) => { T[t] = T[t].filter((r) => !c.includes(r.contact)); }); T.review_authors = T.review_authors.filter((r) => !c.includes(r.email));
        T.profiles.filter((p) => c.includes(p.email)).forEach((p) => Object.assign(p, { name: '', phone: '', addresses: [], prefs: {} })); return send(res, 200, null);
      }
      if (m && m[1] === 'get_invoice') { const a = json(); const o = T.orders.find((x) => x.id === String(a.order_id).trim().toUpperCase() && x.phone === normPhone(a.phone_no)); return send(res, 200, (o && T.invoices.find((x) => x.order_id === o.id && x.kind === 'invoice' && x.status === 'Issued')) || null); }
      if (m && m[1] === 'note_payment') { const a = json(), ref = String(a.utr || '').trim().toUpperCase(); if (!/^[A-Z0-9]{8,22}$/.test(ref)) return send(res, 400, { message: 'bad_utr' });
        const o = T.orders.find((x) => x.id === String(a.order_id).trim().toUpperCase() && x.phone === normPhone(a.phone_no) && x.method === 'UPI QR' && x.status === 'Awaiting payment');
        if (!o) return send(res, 400, { message: 'not_found' }); o.data.utr = ref; o.data.utrAt = new Date().toISOString(); return send(res, 200, null); }
      if (m && m[1] === 'get_order') { const a = json(); const o = T.orders.find((x) => x.id === String(a.order_id).trim().toUpperCase() && x.phone === normPhone(a.phone_no)); return send(res, 200, o ? Object.assign({}, o.data, { status: o.status }) : null); }
      if (m && m[1] === 'cancel_order') {
        if (!own) return fail(res, 400, 'not_allowed');
        const o = T.orders.find((x) => x.id === json().order_id); if (!o || !['Awaiting payment', 'Placed', 'Packed'].includes(o.status)) return fail(res, 400, 'cannot_cancel');
        o.data.items.forEach((it) => { const s = T.stock.find((x) => x.sku === it.sku); if (s) s.qty += it.qty; }); const gc = T.gift_cards.find((x) => x.code === o.data.card); if (gc) gc.balance += o.data.cardOff || 0; ((w) => autoInvoice(Object.assign(o, { status: 'Cancelled' }), w))(o.status); return send(res, 200, null);
      }
      if (m && m[1] === 'check_coupon') { const a = json(); try { return send(res, 200, couponOff(a.code_in, a.base, custOf(auth))); } catch (e) { return fail(res, 400, e.message); } }
      if (m && m[1] === 'issue_invoice') {
        if (!own) return fail(res, 400, 'not_allowed'); const a = json(); const o = T.orders.find((x) => x.id === a.order_id_in); if (!o) return fail(res, 400, 'not_found');
        try { return send(res, 200, mkInvoice(o, a.kind_in, a.against_in, (a.snap || {}).reason)); } catch (e) { return fail(res, 400, e.message); }
      }
      if (m && m[1] === 'void_invoice') {
        if (!own) return fail(res, 400, 'not_allowed'); const a = json(); const r = T.invoices.find((x) => x.id === a.inv_id && x.status === 'Issued'); if (!r) return fail(res, 400, 'not_found');
        if (!a.reason) return fail(res, 400, 'bad_invoice'); if (r.kind === 'invoice' && T.invoices.some((x) => x.against === r.id && x.kind === 'credit_note' && x.status === 'Issued')) return fail(res, 400, 'has_credit_note');
        r.status = 'Void'; r.void_reason = a.reason; r.voided_at = new Date().toISOString(); return send(res, 200, r);
      }
      if (m && m[1] === 'set_delay') {
        if (!own) return fail(res, 400, 'not_allowed');
        const a = json(); const o = T.orders.find((x) => x.id === a.order_id); if (!o) return fail(res, 400, 'not_found');
        if (!a.d) { delete o.data.delay; return send(res, 200, null); }
        if (!['Placed', 'Packed', 'Shipped'].includes(o.status)) return fail(res, 400, 'cannot_delay');
        o.data.delay = { reason: String(a.d.reason || '').trim(), note: String(a.d.note || '').trim(), until: a.d.until || '', tell: a.d.tell === true || a.d.tell === 'true', at: new Date().toISOString() }; return send(res, 200, null);
      }
      if (m && m[1] === 'gift_card_balance') { const gc = T.gift_cards.find((x) => x.code === String(json().card_code).trim().toUpperCase()); return send(res, 200, gc ? String(gc.balance) : 'null', 'application/json'); }
      if (m && m[1] === 'my_referral') { const who = String(json().contact_in).trim().toLowerCase(); let r = T.referrers.find((x) => x.contact === who); if (!r) { r = { id: Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, 'X'), contact: who, created_at: new Date().toISOString() }; T.referrers.push(r); } return send(res, 200, JSON.stringify(r.id), 'application/json'); }
      // the pay (Razorpay) and delivery (Shiprocket) functions: paid at once, every PIN reachable, a made-up AWB number
      if (u.pathname === '/functions/v1/pay') { const b = json(); const o = T.orders.find((x) => x.id === b.order_id); if (!o) return fail(res, 404, 'not_found');
        if (o.status === 'Awaiting payment') { o.status = 'Placed'; o.data.payment = { by: 'mock' }; autoInvoice(o, 'Awaiting payment'); } return send(res, 200, { status: o.status, paid: true }); }
      if (u.pathname === '/functions/v1/delivery') { const b = json();
        if (b.action === 'pin') return send(res, 200, { ok: /^[1-9]\d{5}$/.test(b.pin || ''), days: 4 });
        if (b.action === 'book') { if (!own) return fail(res, 403, 'owner_only'); const o = T.orders.find((x) => x.id === b.order_id); if (!o || !['Placed', 'Packed'].includes(o.status)) return fail(res, 409, 'not_ready');
          o.data.parcel = { awb: 'MOCK' + o.id.slice(3, 7), courier: 'Mock Express', track: 'https://shiprocket.co/tracking/MOCK', booked: new Date().toISOString() }; o.status = 'Packed'; return send(res, 200, { status: o.status, ship: o.data.parcel }); }
        return fail(res, 400, 'bad_request'); }
      m = /^\/rest\/v1\/(\w+)$/.exec(u.pathname); if (!m || !T[m[1]]) return fail(res, 404, 'no such table');
      const t = m[1], key = KEYS[t] || 'id', now = new Date().toISOString();
      if (req.method === 'GET') return send(res, 200, filter(T[t].filter((r) => canRead(t, r, own)), q));
      if (req.method === 'POST') {
        const rows = [].concat(json()); const upsert = /merge-duplicates/.test(req.headers.prefer || '');
        for (const r of rows) {
          if (!canInsert(t, r, own)) return fail(res, 403, 'new row violates row-level security policy for table "' + t + '"');
          if (!own && ['subscribers', 'restock_requests', 'reminders'].includes(t)) { r.contact = normContact(r.contact); if (!r.contact) return fail(res, 400, 'bad_contact'); }
          if (key === 'id' && !r.id) r.id = uuid();
          if (!own && t === 'reviews') {
            const em = custOf(auth); Object.assign(r, { published: false, verified: false, reply: null, featured: false, source: 'site' });
            if (em) {
              if (T.review_authors.some((a) => a.email === em && (T.reviews.find((x) => x.id === a.review_id) || {}).product_id === r.product_id)) return fail(res, 400, 'already_reviewed');
              const p = T.products.find((x) => x.id === r.product_id); r.verified = !!p && T.orders.some((o) => o.data.email === em && o.status === 'Delivered' && o.data.items.some((i) => p.data.variants.some((v) => v.sku === i.sku)));
              T.review_authors.push({ review_id: r.id, email: em, created_at: now });
            }
          }
          if (t === 'events') { if (!/^[a-z_]{2,40}$/.test(r.name || '')) return fail(res, 400, 'bad_event'); r.id = T.events.length + 1; }
          const i = T[t].findIndex((x) => x[key] === r[key]);
          if (i >= 0) { if (!upsert) return fail(res, 409, 'duplicate key'); T[t][i] = Object.assign({}, T[t][i], r, { updated_at: now }); } else T[t].push(Object.assign({ created_at: now }, r));
        }
        return send(res, 201);
      }
      if (!own) return fail(res, 403, 'permission denied');
      const hit = filter(T[t], q);
      if (req.method === 'PATCH') { const p = json(); hit.forEach((r) => { const was = r.status; Object.assign(r, p); if (t === 'orders') autoInvoice(r, was); }); return send(res, 204); }
      if (req.method === 'DELETE') { T[t] = T[t].filter((r) => !hit.includes(r)); return send(res, 204); }
      fail(res, 405, 'method');
    } catch (e) { fail(res, 500, e.message); }
  });
}).listen(PORT, () => console.log('Mock Supabase on http://localhost:' + PORT + ' · owner: ' + OWNER.email + ' / ' + OWNER.password + ', code ' + OWNER.code));
