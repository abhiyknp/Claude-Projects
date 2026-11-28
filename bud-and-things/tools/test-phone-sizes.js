// Phone first: on the main pages at 390 px and 1280 px, no sideways scroll, no console errors, and every visible text
// field and drop-down is at least 48 px tall. Needs tools/preview.sh running (BT_BASE to use another address).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fails = [];
const ok = (label, cond) => { console.log(label, cond ? 'ok' : 'FAIL'); if (!cond) fails.push(label); };
(async () => {
  const b = await chromium.launch(); const base = process.env.BT_BASE || 'http://localhost:8765/page.html';
  const pages = ['', '#shop', '#p-bnt-prd-tl-001', '#cart', '#checkout', '#gifting', '#help', '#privacy', '#account', '#track', '#story', '#journal', '#admin'];
  for (const w of [390, 1280]) for (const h of pages) {
    const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
    await p.addInitScript(() => { try { localStorage.setItem('bt-consent', 'no'); } catch (e) {} });
    await p.goto(base + h); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const short = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select,textarea')].filter(vis)
        .filter((e) => e.getBoundingClientRect().height < 47.5).map((e) => (e.id || e.name || '?') + ' ' + Math.round(e.getBoundingClientRect().height) + 'px');
      return { sx: document.documentElement.scrollWidth > innerWidth, short };
    });
    const n = w + ' ' + (h || 'home');
    ok(n + ': no sideways scroll', !r.sx); ok(n + ': no console errors', errs.length === 0);
    ok(n + ': fields at least 48 px' + (r.short.length ? ' (' + r.short.join(', ') + ')' : ''), r.short.length === 0);
    await ctx.close();
  }
  await b.close();
  if (fails.length) { console.log('FAILED:', fails.join(' | ')); process.exit(1); }
  console.log('Phone size checks passed.');
})();
