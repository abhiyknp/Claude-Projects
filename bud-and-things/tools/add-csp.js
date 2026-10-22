// Adds a Content-Security-Policy and a referrer policy to every page of the built site, so the browser runs only the
// site's own scripts (and the exact inline scripts it was built with), and talks only to the site and its database.
// GitHub Pages can't send these as headers, so they go in as <meta> tags.
//   node bud-and-things/tools/add-csp.js _site            (run by .github/workflows/pages.yml; or one .html file)
// The database address comes from prototype/config.js; BT_CSP_CONNECT adds more (space separated), for local tests.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = process.argv[2]; if (!dir) { console.error('usage: add-csp.js <site folder>'); process.exit(1); }
const cfg = fs.readFileSync(path.join(__dirname, '..', 'prototype', 'config.js'), 'utf8');
const db = (/url:\s*'([^']*)'/.exec(cfg) || [])[1] || '';
const connect = ["'self'", db && new URL(db).origin, 'https://api.postalpincode.in', ...(process.env.BT_CSP_CONNECT || '').split(/\s+/)].filter(Boolean);
// Meta Pixel and Google Analytics, used only when the owner adds an id in Settings
const ads = { script: ['https://connect.facebook.net', 'https://www.googletagmanager.com'], connect: ['https://www.facebook.com', 'https://connect.facebook.net', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'] };
// Cashfree's checkout: its script, the payment window it opens over the page, and the calls it makes
const pay = { script: ['https://sdk.cashfree.com'], frame: ['https://sdk.cashfree.com', 'https://*.cashfree.com'], connect: ['https://*.cashfree.com'], form: ['https://*.cashfree.com'] };
const media = ["'self'", 'data:', 'blob:', db && new URL(db).origin].filter(Boolean);

function policy(html) {
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  return [`default-src 'self'`, `script-src 'self' ${[...ads.script, ...pay.script].join(' ')} ${[...new Set(hashes)].join(' ')}`.trim(),
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com`,
    `img-src ${media.join(' ')} https:`, `media-src ${media.join(' ')} https:`, `connect-src ${[...connect, ...ads.connect, ...pay.connect].join(' ')}`, `frame-src ${pay.frame.join(' ')}`,
    `object-src 'none'`, `base-uri 'self'`, `form-action 'self' ${pay.form.join(' ')}`, `upgrade-insecure-requests`].join('; ');
}

const pages = []; if (/\.html$/.test(dir)) pages.push(dir); else (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.html$/.test(f.name)) pages.push(p); } })(dir);
for (const p of pages) {
  let html = fs.readFileSync(p, 'utf8');
  if (/http-equiv="Content-Security-Policy"/i.test(html)) continue;
  const tags = `<meta http-equiv="Content-Security-Policy" content="${policy(html).replace(/"/g, '&quot;')}"><meta name="referrer" content="strict-origin-when-cross-origin">`;
  if (!/<meta charset="utf-8">/i.test(html)) { console.error('no <meta charset> in ' + p); process.exit(1); }
  html = html.replace(/<meta charset="utf-8">/i, (m) => m + tags);
  fs.writeFileSync(p, html);
}
console.log('Security policy added to ' + pages.length + ' page' + (pages.length === 1 ? '' : 's') + '.');
