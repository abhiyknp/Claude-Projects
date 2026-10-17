// BUD & THINGS · the database link (window.BTDB).
// Products, ritual pairings, site text, settings, stock, photos and videos, orders, reviews and sign-ups live in a
// Supabase project (Postgres plus file storage), reached through its plain HTTP API so no library is loaded.
// With no project set in config.js, BTDB.on is false and the page uses its built-in content and this browser's storage.
(function () {
  'use strict';
  const C = (window.BT_CONFIG && window.BT_CONFIG.supabase) || {};
  const url = String(C.url || '').replace(/\/+$/, ''), key = String(C.anonKey || '');
  const on = !!(url && key);
  // the owner's sign-in: `token` once both steps are done (password, then the authenticator app code), `pending` in between
  let token = null, pending = null;
  const aal = (t) => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal; } catch (e) { return null; } };
  try { token = sessionStorage.getItem('bt-owner-token'); if (token && aal(token) !== 'aal2') { token = null; sessionStorage.removeItem('bt-owner-token'); } } catch (e) { /* storage unavailable */ }
  const keep = (t) => { token = t; pending = null; try { sessionStorage.setItem('bt-owner-token', t); } catch (e) { /* ignore */ } };
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
    // photos and videos, in the public "media" bucket
    fileUrl: (path) => (/^(https?:|data:|blob:|assets\/)/.test(path) ? path : url + '/storage/v1/object/public/media/' + enc(path)),
    upload: (path, file) => req('POST', '/storage/v1/object/media/' + enc(path), file, { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }),
    removeFile: (path) => req('DELETE', '/storage/v1/object/media/' + enc(path)),
    // the owner signs in with the email and password set up in Supabase → Authentication, then with a 6-digit code
    // from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…). The database only lets a
    // sign-in that has passed both steps change anything. Returns { step: 'code' } or { step: 'enrol', qr, secret }.
    signIn: async (email, password) => {
      token = null; pending = null; try { sessionStorage.removeItem('bt-owner-token'); } catch (e) { /* ignore */ }
      const d = await req('POST', '/auth/v1/token?grant_type=password', { email, password }, null, key);
      if (aal(d.access_token) === 'aal2') { keep(d.access_token); return { step: 'done' }; }
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
      return { step: 'enrol', qr, secret: f.totp && f.totp.secret };
    },
    verifyCode: async (code) => {
      if (!pending || !pending.factor) throw new Error('Sign in again.');
      const p = pending.token, id = encodeURIComponent(pending.factor);
      const c = await req('POST', '/auth/v1/factors/' + id + '/challenge', {}, null, p);
      const d = await req('POST', '/auth/v1/factors/' + id + '/verify', { challenge_id: c.id, code: String(code) }, null, p);
      if (aal(d.access_token) !== 'aal2') throw new Error('That code didn’t work. Try the newest one.');
      keep(d.access_token);
    },
    awaitingCode: () => !!pending,
    signOut: () => { token = null; pending = null; try { sessionStorage.removeItem('bt-owner-token'); } catch (e) { /* ignore */ } }
  };
})();
