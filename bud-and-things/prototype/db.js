// BUD & THINGS · the database link (window.BTDB).
// Products, ritual pairings, site text, settings, stock, photos and videos, orders, reviews and sign-ups live in a
// Supabase project (Postgres plus file storage), reached through its plain HTTP API so no library is loaded.
// With no project set in config.js, BTDB.on is false and the page uses its built-in content and this browser's storage.
(function () {
  'use strict';
  const C = (window.BT_CONFIG && window.BT_CONFIG.supabase) || {};
  const url = String(C.url || '').replace(/\/+$/, ''), key = String(C.anonKey || '');
  const on = !!(url && key);
  let token = null;
  try { token = sessionStorage.getItem('bt-owner-token'); } catch (e) { /* storage unavailable */ }
  const enc = (path) => path.split('/').map(encodeURIComponent).join('/');

  async function req(method, path, body, headers) {
    const isFile = typeof Blob !== 'undefined' && body instanceof Blob;
    const h = Object.assign({ apikey: key, Authorization: 'Bearer ' + (token || key) }, body !== undefined && !isFile ? { 'Content-Type': 'application/json' } : {}, headers || {});
    const r = await fetch(url + path, { method, headers: h, body: body === undefined ? undefined : isFile ? body : JSON.stringify(body) });
    const text = await r.text(); let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!r.ok) {
      if (r.status === 401 && token) { token = null; try { sessionStorage.removeItem('bt-owner-token'); } catch (e) { /* ignore */ } }
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
    // the owner signs in with the email and password set up in Supabase → Authentication
    signIn: async (email, password) => {
      const d = await req('POST', '/auth/v1/token?grant_type=password', { email, password });
      token = d.access_token;
      try { sessionStorage.setItem('bt-owner-token', token); } catch (e) { /* ignore */ }
      return d;
    },
    signOut: () => { token = null; try { sessionStorage.removeItem('bt-owner-token'); } catch (e) { /* ignore */ } }
  };
})();
