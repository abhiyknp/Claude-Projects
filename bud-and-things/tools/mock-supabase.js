// A stand-in for Supabase, for testing the site's database mode without an account. It keeps everything in memory
// and answers the small part of the Supabase HTTP API that prototype/db.js uses (tables, two functions, sign-in and
// file storage), with the same who-may-do-what rules as supabase/schema.sql.
//   node tools/mock-supabase.js            serves on http://localhost:54321
//   owner sign-in: hello@budandthings.com / demo
// Point the site at it with  window.BT_CONFIG = { supabase: { url: 'http://localhost:54321', anonKey: 'anon' } }  in config.js.
const http = require('http');
const PORT = +process.env.PORT || 54321;
const OWNER = { email: 'hello@budandthings.com', password: 'demo', token: 'owner-token' };
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

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE', 'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer,x-upsert' }); return res.end(); }
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const raw = Buffer.concat(chunks); const u = new URL(req.url, 'http://x'); const q = u.searchParams;
    const own = (req.headers.authorization || '') === 'Bearer ' + OWNER.token;
    const json = () => (raw.length ? JSON.parse(raw.toString()) : null);
    try {
      if (u.pathname === '/auth/v1/token') { const b = json(); return b.email === OWNER.email && b.password === OWNER.password ? send(res, 200, { access_token: OWNER.token, token_type: 'bearer' }) : send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' }); }
      let m = /^\/storage\/v1\/object\/(public\/)?media\/(.+)$/.exec(u.pathname);
      if (m) {
        const path = decodeURIComponent(m[2]);
        if (req.method === 'GET') return FILES[path] ? send(res, 200, FILES[path].body, FILES[path].type) : fail(res, 404, 'not found');
        if (!own) return fail(res, 403, 'new row violates row-level security policy');
        if (req.method === 'DELETE') { delete FILES[path]; return send(res, 200, [{ name: path }]); }
        FILES[path] = { body: raw, type: req.headers['content-type'] }; return send(res, 200, { Key: 'media/' + path });
      }
      m = /^\/rest\/v1\/rpc\/(\w+)$/.exec(u.pathname);
      if (m && m[1] === 'place_order') {
        const o = json().o; let sub = 0;
        for (const it of o.items) {
          if (!(it.qty >= 1)) return fail(res, 400, 'bad_quantity');
          const v = T.products.filter((p) => p.live).flatMap((p) => p.data.variants).find((x) => x.sku === it.sku); if (!v) return fail(res, 400, 'unknown_item:' + it.sku);
          sub += v.price * it.qty;
          const s = T.stock.find((x) => x.sku === it.sku); if (!s || s.qty < it.qty) return fail(res, 400, 'sold_out:' + it.sku);
        }
        if (sub !== o.sub) return fail(res, 400, 'price_changed');
        o.items.forEach((it) => { T.stock.find((x) => x.sku === it.sku).qty -= it.qty; });
        const id = 'BT-' + orderNo++; T.orders.push({ id, data: Object.assign({}, o, { id }), status: 'Placed', phone: o.contact.phone, total: o.total, created_at: new Date().toISOString() });
        return send(res, 200, JSON.stringify(id), 'application/json');
      }
      if (m && m[1] === 'get_order') { const a = json(); const o = T.orders.find((x) => x.id === a.order_id && x.phone === a.phone_no); return send(res, 200, o ? Object.assign({}, o.data, { status: o.status }) : null); }
      m = /^\/rest\/v1\/(\w+)$/.exec(u.pathname); if (!m || !T[m[1]]) return fail(res, 404, 'no such table');
      const t = m[1], key = KEYS[t] || 'id', now = new Date().toISOString();
      if (req.method === 'GET') return send(res, 200, filter(T[t].filter((r) => canRead(t, r, own)), q));
      if (req.method === 'POST') {
        const rows = [].concat(json()); const upsert = /merge-duplicates/.test(req.headers.prefer || '');
        for (const r of rows) {
          if (!canInsert(t, r, own)) return fail(res, 403, 'new row violates row-level security policy for table "' + t + '"');
          if (key === 'id' && !r.id) r.id = uuid();
          if (t === 'reviews' && r.published == null) r.published = false;
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
}).listen(PORT, () => console.log('Mock Supabase on http://localhost:' + PORT + ' · owner: ' + OWNER.email + ' / ' + OWNER.password));
