// End-to-end shop flow at desktop and phone width: add to cart, checkout validation, UPI payment, order page,
// owner view, finder. Prints what it sees and any page errors. Needs a preview server (tools/preview.sh).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const url = process.env.BT_URL || 'http://localhost:8765/page.html';
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    pg.on('pageerror', (e) => errs.push(w + ' pageerror: ' + e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/ERR_/.test(m.text())) errs.push(w + ' console: ' + m.text()); });
    await pg.goto(url + '#home');
    await pg.mouse.wheel(0, 1500); await pg.waitForTimeout(300);
    const over = async (tag) => { const o = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 0) errs.push(`${w} overflow ${o}px on ${tag}`); };
    await over('home');
    await pg.goto(url + '#p-chai-at-four'); await pg.waitForTimeout(100); await over('product');
    await pg.click('[data-act="pdp-qty"][data-d="1"]');
    await pg.click('[data-act="add"]');
    const msg = await pg.textContent('.drawer .status'); console.log(w, 'drawer:', msg.trim());
    await pg.click('.drawer a[href="#checkout"]'); await pg.waitForTimeout(100);
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
    await pg.click('[data-act="advance"]');
    console.log(w, 'admin status:', await pg.$$eval('td .pill', (e) => e.map((x) => x.textContent).slice(0, 1)), '| stock CF-220:', await pg.inputValue('#st-BT-CN-CF-220'));
    await pg.goto(url + '#feeling'); await pg.click('[data-act="finder-opt"][data-v="calm"]');
    for (let i = 0; i < 5; i++) await pg.click('[data-act="finder-next"]');
    console.log(w, 'finder:', await pg.$$eval('.finder-main .name', (e) => e.map((x) => x.textContent)));
    await over('finder');
    await pg.close();
  }
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
