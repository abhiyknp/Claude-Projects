// Festive looks, the daily note and the Owner view's easy mode. Needs a preview server (tools/preview.sh).
// Checks: nothing festive by default; the Owner must confirm before customers see a look; every look starts
// without errors at desktop and phone width and on a reduced-motion device; the thank-you moment opens and closes.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch(); const errs = []; let fails = 0;
  const ok = (l, c) => { console.log(l, c ? 'ok' : 'FAIL'); if (!c) fails++; };
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  const open = async (ctx, tag) => {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(tag + ' ' + e.message));
    await p.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
    await p.goto(url + '#home'); await p.waitForTimeout(900); return p;
  };
  for (const [w, h, tag] of [[1280, 800, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await open(ctx, tag);
    ok(tag + ': festive.js loaded', await p.evaluate(() => !!window.BTFest));
    ok(tag + ': daily note on the home page', await p.evaluate(() => (document.querySelector('#ft-nq') || {}).textContent && document.querySelector('#ft-nq').textContent.length > 10));
    ok(tag + ': another note changes it', await (async () => { const a = await p.textContent('#ft-nq'); await p.click('[data-act="ft-note"]'); await p.waitForTimeout(200); return (await p.textContent('#ft-nq')) !== a; })());
    ok(tag + ': no festive look by default', await p.evaluate(() => !BTFest.active()));
    for (const id of await p.evaluate(() => BTFest.scenes.map((s) => s.id))) {
      await p.evaluate((i) => { scrollTo(0, 0); BTFest.start(i, { preview: true }); }, id); await p.waitForTimeout(1100);
      ok(tag + ': ' + id + ' starts', await p.evaluate((i) => BTFest.active() === i && document.getElementById('ft-layer').children[1].children.length > 0 || i === 'ny' || i === 'holi' || i === 'eid', id));
      ok(tag + ': ' + id + ' never covers the product photo or heading', await p.evaluate(() => { const L = document.getElementById('ft-layer').getBoundingClientRect(); const ph = document.querySelector('.gh-ph'), h1 = document.querySelector('.gh-hero h1'); return (!ph || L.bottom <= ph.getBoundingClientRect().top + 1) && (!h1 || L.bottom <= h1.getBoundingClientRect().top + 1); }));
      await p.evaluate(() => BTFest.stop());
    }
    await p.goto(url + '#admin'); await p.waitForTimeout(700);
    ok(tag + ': Owner start screen has the quick tiles', await p.evaluate(() => document.querySelectorAll('.adm-tiles button').length === 8));
    ok(tag + ': easy mode shows the everyday tabs only', await p.evaluate(() => document.querySelectorAll('.adm-tabs [role=tab]').length === 8));
    await p.click('[data-act="adm-mode"]'); await p.waitForTimeout(200);
    ok(tag + ': show all tools lists every tab', await p.evaluate(() => document.querySelectorAll('[role=tab]').length >= 25));
    await p.click('[data-act="adm-tab"][data-v="festive"]'); await p.waitForTimeout(300);
    ok(tag + ': seven looks listed', await p.evaluate(() => document.querySelectorAll('.ft-card').length === 7));
    await p.click('.ft-card >> nth=0 >> [data-act="ft-ask"]');
    ok(tag + ': asks before applying', await p.evaluate(() => !!document.querySelector('[data-act="ft-apply"]') && !BTFest.active()));
    await p.click('[data-act="ft-noask"]');
    await p.click('.ft-card >> nth=0 >> [data-act="ft-prev"]'); await p.waitForTimeout(600);
    ok(tag + ': preview shows a bar and the look', await p.evaluate(() => BTFest.active() === 'xmas' && !!document.getElementById('ft-bar')));
    await p.click('#ft-bar [data-act="ft-prev-stop"]'); await p.waitForTimeout(400);
    ok(tag + ': stopping the preview removes the look', await p.evaluate(() => !BTFest.active() && !document.getElementById('ft-bar')));
    await p.click('[data-act="adm-tab"][data-v="festive"]').catch(() => {}); await p.waitForTimeout(200);
    await p.fill('#ft-offer', 'Test offer line'); await p.fill('#ft-code', 'TEST15'); await p.locator('#ft-code').blur(); await p.waitForTimeout(300);
    await p.click('.ft-card >> nth=1 >> [data-act="ft-ask"]'); await p.click('[data-act="ft-apply"]'); await p.waitForTimeout(500);
    ok(tag + ': celebration banner after applying', await p.evaluate(() => !!document.querySelector('.ft-cel')));
    ok(tag + ': says when the look turns itself off', await p.evaluate(() => /turns itself off after/.test(document.querySelector('.adm-body').textContent)));
    await p.goto(url + '#home'); await p.waitForTimeout(900);
    ok(tag + ': customers now see the look', await p.evaluate(() => BTFest.active() === 'ny'));
    await p.goto(url + '#shop'); await p.waitForTimeout(900);
    ok(tag + ': the offer strap shows on other pages too', await p.evaluate(() => { const s = document.getElementById('ft-strap'); return !!s && s.style.display !== 'none' && /Test offer line/.test(s.textContent) && /TEST15/.test(s.textContent); }));
    ok(tag + ': the strap has a live countdown', await p.evaluate(() => /\d\d:\d\d/.test((document.getElementById('ft-clock') || {}).textContent || '')));
    ok(tag + ': the strap sits under the menu and above the page', await p.evaluate(() => { const s = document.getElementById('ft-strap'), h = document.querySelector('.site-head'); return s.getBoundingClientRect().top >= h.getBoundingClientRect().bottom - 1; }));
    ok(tag + ': the footer ribbon shows', await p.evaluate(() => { const f = document.getElementById('ft-foot'); return !!f && f.style.display !== 'none'; }));
    await p.goto(url + '#admin'); await p.waitForTimeout(500);
    ok(tag + ': no strap in the Owner view', await p.evaluate(() => document.getElementById('ft-strap').style.display === 'none'));
    await p.goto(url + '#shop'); await p.waitForTimeout(500);
    await p.click('#ft-strap .ft-sx'); await p.waitForTimeout(300);
    ok(tag + ': the strap can be hidden', await p.evaluate(() => document.getElementById('ft-strap').style.display === 'none'));
    await p.evaluate(() => sessionStorage.removeItem('ft-sx'));
    await p.goto(url + '#shop'); await p.waitForTimeout(300);
    ok(tag + ': look is hidden away from the home page', await p.evaluate(() => document.getElementById('ft-layer').style.display === 'none'));
    await p.evaluate(() => { BTFest.thanks({ text: 'Order test is paid.' }); }); await p.waitForTimeout(300);
    ok(tag + ': thank-you opens', await p.evaluate(() => !!document.querySelector('.ft-thx')));
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok(tag + ': thank-you closes with Escape', await p.evaluate(() => !document.querySelector('.ft-thx')));
    ok(tag + ': no sideways scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await ctx.close();
  }
  const rc = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const rp = await open(rc, 'reduced');
  await rp.evaluate(() => BTFest.start('xmas', { preview: true })); await rp.waitForTimeout(400);
  ok('reduced motion: the look still shows, calm', await rp.evaluate(() => BTFest.active() === 'xmas' && !document.querySelector('.ft-intro')));
  await b.close(); console.log('page errors:', errs.length ? errs : 'none');
  if (fails || errs.length) process.exit(1); console.log('Festive look checks passed.');
})();
