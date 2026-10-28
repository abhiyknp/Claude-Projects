// End-to-end shop flow at desktop and phone width: add to cart, checkout validation, UPI payment, order page,
// sign-in, the 3D sample room, owner view, finder. Prints what it sees and any page errors. Needs a preview server (tools/preview.sh).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    // config.js now points at the live project, where the Coming soon page hides the shop; this flow runs on the built-in draft content
    await pg.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
    pg.on('pageerror', (e) => errs.push(w + ' pageerror: ' + e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_/.test(m.text())) errs.push(w + ' console: ' + m.text()); });
    await pg.goto(url + '#home');
    await pg.mouse.wheel(0, 1500); await pg.waitForTimeout(300);
    const over = async (tag) => { const o = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 0) errs.push(`${w} overflow ${o}px on ${tag}`); };
    await over('home');
    await pg.goto(url + '#p-chai-at-four'); await pg.waitForTimeout(100); await over('product');
    await pg.click('[data-act="room-open"]'); await pg.click('[data-act="room-3d"]'); await pg.waitForSelector('#room3d-cv'); await pg.waitForTimeout(1500);
    console.log(w, 'sample room:', (await pg.textContent('#room-h')).trim(), '| loading note left:', !!(await pg.$('#room-load')));
    await pg.click('[data-act="room-look"][data-v="dusk"]'); await pg.click('[data-act="room-lit"]'); await pg.waitForTimeout(300);
    await pg.screenshot({ path: (process.env.BT_SHOTS || '/tmp') + `/room-${w}.png` });
    await pg.click('[data-act="room-close"]');
    await pg.click('[data-act="pdp-qty"][data-d="1"]');
    await pg.click('[data-act="add"]');
    const msg = await pg.textContent('.drawer .status'); console.log(w, 'drawer:', msg.trim());
    await pg.click('.drawer a[href="#checkout"]'); await pg.waitForTimeout(100);
    // checkout asks for sign-in first; the preview shows the emailed code on screen
    console.log(w, 'checkout gate:', (await pg.textContent('.signin h2')).trim());
    await pg.fill('#acct-email', 'meera@example.com'); await pg.click('form[data-form="acct-email"] button[type="submit"]'); await pg.waitForTimeout(100);
    await pg.fill('#acct-code', '000000'); await pg.click('form[data-form="acct-code"] button[type="submit"]'); await pg.waitForTimeout(100);
    console.log(w, 'wrong code:', (await pg.textContent('#acct-err')).trim());
    await pg.fill('#acct-code', (await pg.textContent('.signin .status strong')).trim()); await pg.click('form[data-form="acct-code"] button[type="submit"]'); await pg.waitForTimeout(150);
    await pg.click('form[data-form="contact"] button[type="submit"]');
    console.log(w, 'contact errors:', await pg.$$eval('.err', (e) => e.map((x) => x.textContent)));
    await pg.fill('#co-name', 'Meera Rao'); await pg.fill('#co-phone', '9876543210');
    await pg.click('form[data-form="contact"] button[type="submit"]');
    await pg.fill('#co-line1', '12 Lake View Road'); await pg.fill('#co-pin', '560001'); await pg.fill('#co-city', 'Bengaluru'); await pg.selectOption('#co-state', 'Karnataka');
    await pg.click('form[data-form="address"] button[type="submit"]'); await over('payment');
    console.log(w, 'pay heading:', (await pg.textContent('h1')).trim(), '| summary total:', (await pg.textContent('.checkout-side .grand')).trim());
    await pg.click('[data-act="pay-success"]'); await pg.waitForTimeout(150);
    console.log(w, 'order page:', (await pg.textContent('h1')).trim(), '|', (await pg.textContent('.checkout-side .grand')).trim());
    await pg.goto(url + '#admin'); await pg.waitForTimeout(100); await over('admin');
    await pg.click('[data-act="adm-tab"][data-v="orders"]');
    await pg.click('[data-act="advance"]');
    console.log(w, 'admin status:', await pg.$$eval('td .pill', (e) => e.map((x) => x.textContent).slice(0, 1)));
    await pg.click('[data-act="advance"]'); await pg.click('[data-act="advance"]');
    console.log(w, 'admin status now:', await pg.$$eval('td .pill', (e) => e.map((x) => x.textContent).slice(0, 1)));
    // Bud Points: earned once delivered, then spent at the next checkout
    await pg.goto(url + '#account'); await pg.waitForTimeout(100);
    console.log(w, 'points:', (await pg.textContent('.acct-card.points strong')).trim());
    await pg.goto(url + '#p-ghat-tray'); await pg.click('[data-act="add"]'); await pg.keyboard.press('Escape'); await pg.goto(url + '#checkout'); await pg.waitForTimeout(100);
    const before = (await pg.textContent('.checkout-side .grand')).trim(); await pg.click('[data-act="pts-use"]'); await pg.waitForTimeout(100);
    console.log(w, 'with points:', before, '→', (await pg.textContent('.checkout-side .grand')).trim());
    await pg.goto(url + '#admin'); await pg.waitForTimeout(100);
    await pg.click('[data-act="adm-tab"][data-v="stock"]'); console.log(w, 'stock CF-220:', await pg.inputValue('#st-BT-CN-CF-220'));
    await pg.goto(url + '#feeling'); await pg.click('[data-act="finder-opt"][data-v="calm"]');
    for (let i = 0; i < 5; i++) await pg.click('[data-act="finder-next"]');
    console.log(w, 'finder:', await pg.$$eval('.finder-main .name', (e) => e.map((x) => x.textContent)));
    await over('finder');
    await pg.close();
  }
  console.log('ERRORS:', errs.length ? errs : 'none');
  if (errs.length) process.exitCode = 1;
  await b.close();
})();
