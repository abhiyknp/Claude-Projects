// BUD & THINGS · the database link (window.BTDB).
// Products, ritual pairings, site text, settings, stock, photos and videos, orders, reviews and sign-ups live in a
// Supabase project (Postgres plus file storage), reached through its plain HTTP API so no library is loaded.
// With no project set in config.js, BTDB.on is false and the page uses its built-in content and this browser's storage.
(function () {
  'use strict';
  const C = (window.BT_CONFIG && window.BT_CONFIG.supabase) || {};
  const url = String(C.url || '').replace(/\/+$/, ''), key = String(C.anonKey || '');
  const on = !!(url && key);
  const twoStep = !!(window.BT_CONFIG && window.BT_CONFIG.ownerTwoStep);
  // the owner's sign-in: `token` once both steps are done (password, then the authenticator app code), `pending` in between
  let token = null, pending = null;
  const aal = (t) => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal; } catch (e) { return null; } };
  try { token = sessionStorage.getItem('bt-owner-token'); if (token && twoStep && aal(token) !== 'aal2') { token = null; sessionStorage.removeItem('bt-owner-token'); } } catch (e) { /* storage unavailable */ }
  const keep = (t) => { token = t; pending = null; try { sessionStorage.setItem('bt-owner-token', t); } catch (e) { /* ignore */ } };
  // a customer's sign-in (emailed code): kept in this browser and renewed when it runs out, like Supabase's own library does
  let cust = null;
  try { cust = JSON.parse(localStorage.getItem('bt-customer') || 'null'); } catch (e) { cust = null; }
  const keepCust = (d) => {
    cust = d && d.access_token ? { access: d.access_token, refresh: d.refresh_token, exp: Date.now() + ((d.expires_in || 3600) - 60) * 1000, email: String((d.user && d.user.email) || (cust && cust.email) || '').toLowerCase() } : null;
    try { if (cust) localStorage.setItem('bt-customer', JSON.stringify(cust)); else localStorage.removeItem('bt-customer'); } catch (e) { /* storage unavailable */ }
  };
  async function custToken() {
    if (!cust) return null; if (Date.now() < cust.exp) return cust.access;
    try { keepCust(await req('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: cust.refresh }, null, key)); } catch (e) { keepCust(null); }
    return cust && cust.access;
  }
  const CL = (window.BT_CONFIG && window.BT_CONFIG.cloudinary) || {};
  const cloud = String(CL.cloud || ''), preset = String(CL.preset || '');
  const isCl = (p) => /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\//.test(p);
  // Cloudinary pictures and videos arrive in the best format and quality for each visitor, no wider than `w` pixels
  const sized = (p, w) => p.replace('/upload/', '/upload/f_auto,q_auto' + (w ? ',w_' + w + ',c_limit' : '') + '/');
  const enc = (path) => path.split('/').map(encodeURIComponent).join('/');

  async function req(method, path, body, headers, bearer) {
    const isFile = typeof Blob !== 'undefined' && body instanceof Blob;
    const h = Object.assign({ apikey: key, Authorization: 'Bearer ' + (bearer || token || key) }, body !== undefined && !isFile ? { 'Content-Type': 'application/json' } : {}, headers || {});
    const r = await fetch(url + path, { method, headers: h, body: body === undefined ? undefined : isFile ? body : JSON.stringify(body) });
    const text = await r.text(); let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!r.ok) {
      if (r.status === 401 && token && !bearer) { token = null; try { sessionStorage.removeItem('bt-owner-token'); } catch (e) { /* ignore */ } }
      const err = new Error((data && (data.message || data.error_description || data.msg || data.error)) || ('Request failed (' + r.status + ')'));
      err.status = r.status; throw err;
    }
    return data;
  }

  window.BTDB = {
    on,
    url,
    owner: () => !!token,
    // everything the public site reads, in one go
    loadAll: async () => {
      const get = (t, q) => req('GET', '/rest/v1/' + t + '?select=*' + (q ? '&' + q : ''));
      const [products, pairings, text, settings, stock, media, reviews] = await Promise.all([
        get('products', 'order=sort'), get('pairings', 'order=sort'), get('site_text'), get('settings'), get('stock'),
        get('media', 'order=sort'), get('reviews', 'published=eq.true&order=created_at.desc')]);
      return { products, pairings, text, settings, stock, media, reviews };
    },
    list: (table, query) => req('GET', '/rest/v1/' + table + '?select=*' + (query ? '&' + query : '')),
    upsert: (table, rows) => req('POST', '/rest/v1/' + table, rows, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
    insert: (table, row) => req('POST', '/rest/v1/' + table, row, { Prefer: 'return=minimal' }),
    update: (table, match, patch) => req('PATCH', '/rest/v1/' + table + '?' + match, patch, { Prefer: 'return=minimal' }),
    remove: (table, match) => req('DELETE', '/rest/v1/' + table + '?' + match),
    rpc: (fn, args) => req('POST', '/rest/v1/rpc/' + fn, args || {}),
    // the shop's Edge Functions (supabase/functions): pay (Razorpay) and delivery (Shiprocket)
    fn: (name, body) => req('POST', '/functions/v1/' + name, body || {}),
    // photos and videos, in the public "media" bucket
    fileUrl: (path, w) => (isCl(path) ? (/\/upload\/(f_|q_|w_)/.test(path) ? path : sized(path, w === undefined ? 1600 : w)) : /^(https?:|data:|blob:|assets\/)/.test(path) ? path : url + '/storage/v1/object/public/media/' + enc(path)),
    upload: (path, file) => req('POST', '/storage/v1/object/media/' + enc(path), file, { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }),
    // saves a photo or video and returns the path to keep in the media table: a Cloudinary address when Cloudinary is set
    // up in config.js (unsigned preset, so no secret is needed here), otherwise a path in the Supabase "media" bucket
    store: async (path, file) => {
      if (!cloud || !preset) { await window.BTDB.upload(path, file); return path; }
      const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', preset); fd.append('folder', 'bud-and-things/' + path.split('/')[0]);
      const r = await fetch('https://api.cloudinary.com/v1_1/' + cloud + '/auto/upload', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.secure_url) throw new Error((j.error && j.error.message) || ('Cloudinary upload failed (' + r.status + ')'));
      return j.secure_url;
    },
    removeFile: (path) => req('DELETE', '/storage/v1/object/media/' + enc(path)),
    // the owner signs in with the email and password set up in Supabase → Authentication, then with a 6-digit code
    // from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) when config.js turns the
    // second step on. Returns { step: 'done' }, { step: 'code' } or { step: 'enrol', qr, secret }.
    signIn: async (email, password) => {
      token = null; pending = null; try { sessionStorage.removeItem('bt-owner-token'); } catch (e) { /* ignore */ }
      const d = await req('POST', '/auth/v1/token?grant_type=password', { email, password }, null, key);
      if (!twoStep || aal(d.access_token) === 'aal2') { keep(d.access_token); return { step: 'done' }; }
      pending = { token: d.access_token };
      const u = await req('GET', '/auth/v1/user', undefined, null, pending.token);
      const totp = (u.factors || []).filter((f) => f.factor_type === 'totp');
      const ready = totp.find((f) => f.status === 'verified');
      if (ready) { pending.factor = ready.id; return { step: 'code' }; }
      // first time: clear any half-finished set-up, then start a new one
      for (const f of totp) await req('DELETE', '/auth/v1/factors/' + encodeURIComponent(f.id), undefined, null, pending.token);
      const f = await req('POST', '/auth/v1/factors', { factor_type: 'totp', friendly_name: 'Owner view ' + new Date().toISOString().slice(0, 10) }, null, pending.token);
      pending.factor = f.id;
      // Supabase sends the QR code as a data address with raw SVG in it ("data:img/svg+xml;utf-8,<svg..."), which browsers
      // won't show as is (a "#" cuts it short, and "img/" isn't a picture type). Take the SVG out and show it as a file instead.
      let qr = (f.totp && f.totp.qr_code) || '';
      if (/^data:/i.test(qr)) {
        const head = qr.slice(0, qr.indexOf(',') + 1); let svg = qr.slice(head.length);
        try { svg = /;base64,$/i.test(head) ? atob(svg) : svg.trim().startsWith('<') ? svg : decodeURIComponent(svg); } catch (e) { svg = ''; }
        qr = svg.trim().startsWith('<') ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })) : '';
      }
      return { step: 'enrol', qr, uri: f.totp && f.totp.uri, secret: f.totp && f.totp.secret };
    },
    verifyCode: async (code) => {
      if (!pending || !pending.factor) throw new Error('Sign in again.');
      const p = pending.token, id = encodeURIComponent(pending.factor);
      const c = await req('POST', '/auth/v1/factors/' + id + '/challenge', {}, null, p);
      const d = await req('POST', '/auth/v1/factors/' + id + '/verify', { challenge_id: c.id, code: String(code) }, null, p);
      if (aal(d.access_token) !== 'aal2') throw new Error('That code didn’t work. Try the newest one.');
      keep(d.access_token);
    },
    // customers sign in with a 6-digit code emailed by Supabase (Authentication → Email: the "Magic Link" template must
    // include {{ .Token }}). Their session is separate from the owner's and only proves they own the email; customers
    // are never owners (is_owner() checks the owners table). It lets them place orders and read their own orders and points.
    sendCode: (email) => req('POST', '/auth/v1/otp', { email, create_user: true }, null, key),
    verifyEmailCode: async (email, code) => { const d = await req('POST', '/auth/v1/verify', { type: 'email', email, token: String(code) }, null, key); keepCust(d); return cust; },
    customer: () => (cust ? cust.email : null),
    // functions only a signed-in customer may call: place_order and my_orders. "sign_in" means the session has ended.
    custRpc: async (fn, args) => { const t = await custToken(); if (!t) { const e = new Error('sign_in'); e.status = 401; throw e; } return req('POST', '/rest/v1/rpc/' + fn, args || {}, null, t); },
    // a visitor's row sent as the signed-in customer when there is one (so a review can be marked "Verified buyer")
    custInsert: async (table, row) => { const t = await custToken(); return req('POST', '/rest/v1/' + table, row, { Prefer: 'return=minimal' }, t || key); },
    // anonymous visit events for Owner view → Analytics; `keepalive` lets the last few go out as the page closes
    beacon: (rows) => fetch(url + '/rest/v1/events', { method: 'POST', keepalive: true, headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rows) }).catch(() => {}),
    custSignOut: () => { const t = cust && cust.access; keepCust(null); if (t) req('POST', '/auth/v1/logout', {}, null, t).catch(() => {}); },
    awaitingCode: () => !!pending,
    signOut: () => { token = null; pending = null; try { sessionStorage.removeItem('bt-owner-token'); } catch (e) { /* ignore */ } }
  };
})();
