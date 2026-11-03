#!/usr/bin/env node
// Checks, with the PUBLIC key only, that a visitor cannot read private tables. It only reads, never writes, and prints
// only table names, HTTP codes and row counts: never any row content.
//   node bud-and-things/tools/rls-probe.js            (reads the project address and public key from prototype/config.js)
//   BT_URL=https://xxxx.supabase.co BT_KEY=<anon key> node bud-and-things/tools/rls-probe.js
// A private table must answer 401/403, or 200 with 0 rows. Any rows = FAIL: tell the developer straight away.
const fs = require('fs'), path = require('path');
const cfg = fs.readFileSync(path.join(__dirname, '../prototype/config.js'), 'utf8');
const base = process.env.BT_URL || (cfg.match(/url:\s*'(https:[^']+)'/) || [])[1];
const key = process.env.BT_KEY || (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
if (!base || !key) { console.error('No project address or public key found.'); process.exit(2); }
// public by design (see supabase/schema.sql): published or public rows only
const PUBLIC = ['products', 'pairings', 'site_text', 'settings', 'stock', 'media', 'reviews'];
const PRIVATE = ['owners', 'orders', 'subscribers', 'restock_requests', 'reminders', 'gift_cards', 'coupons', 'points_log', 'invoice_counters', 'invoices', 'referrers', 'profiles', 'notifications', 'review_authors', 'customer_meta', 'events', 'hits', 'change_log'];
async function probe(t) {
  try {
    const r = await fetch(`${base}/rest/v1/${t}?select=*&limit=3`, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    let n = null; if (r.ok) { const j = await r.json(); n = Array.isArray(j) ? j.length : null; }
    return { t, code: r.status, n };
  } catch (e) { return { t, code: 'no answer', n: null }; }
}
(async () => {
  let fail = 0, unreachable = 0;
  console.log('Public tables (rows are expected):');
  for (const t of PUBLIC) { const r = await probe(t); if (r.code === 'no answer') unreachable++; console.log(`  ${t.padEnd(18)} HTTP ${r.code}  rows seen: ${r.n}`); }
  console.log('Private tables (must show no rows):');
  for (const t of PRIVATE) {
    const r = await probe(t); const ok = r.code === 401 || r.code === 403 || r.code === 404 || (r.code === 200 && r.n === 0);
    if (r.code === 'no answer') unreachable++; else if (!ok) fail++;
    console.log(`  ${t.padEnd(18)} HTTP ${r.code}  rows seen: ${r.n}  ${r.code === 'no answer' ? 'NOT TESTED' : ok ? 'PASS' : 'FAIL'}`);
  }
  if (unreachable) { console.log(`\n${unreachable} table(s) could not be reached: check your internet connection. Result: NOT TESTED.`); process.exit(2); }
  console.log(fail ? `\nRESULT: FAIL (${fail} private table(s) returned rows). Do not open the shop. Tell the developer.` : '\nRESULT: PASS. A visitor with the public key sees no rows in any private table.');
  process.exit(fail ? 1 : 0);
})();
