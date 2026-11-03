// A photo that fails to load must not leave a broken image: the page draws again with the next choice. Needs tools/preview.sh running.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await pg.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
  await pg.route('**/broken-photo.jpg', (r) => r.fulfill({ status: 404, body: 'nf' }));
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  // demo mode keeps the owner's photos in this browser: add one whose address does not load
  await pg.addInitScript(() => { try { const k = 'bt-proto-v2'; const st = JSON.parse(localStorage.getItem(k) || '{}'); st.db = Object.assign({}, st.db, { media: [{ id: 'x', product_id: 'bnt-prd-cg-001', kind: 'photo', role: 'packshot', path: 'https://localhost:8765/broken-photo.jpg', alt: '', sort: 0, published: true }] }); localStorage.setItem(k, JSON.stringify(st)); } catch (e) { /* ignore */ } });
  await pg.goto(url + '#home'); await pg.waitForTimeout(500); await pg.evaluate(() => { document.querySelector('.spot')?.scrollIntoView(); }); await pg.waitForTimeout(900);
  const left = await pg.evaluate(() => [...document.images].filter((i) => /broken-photo/.test(i.getAttribute('src') || '')).length);
  const broken = await pg.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length);
  const tiles = await pg.evaluate(() => document.querySelectorAll('.spot-ph').length);
  console.log('broken-photo images left:', left, '| broken images:', broken, '| spotlights:', tiles);
  await b.close();
  if (left || broken || !tiles) { console.error('FAILED'); process.exit(1); }
  console.log('Photo fallback checks passed.');
})();
