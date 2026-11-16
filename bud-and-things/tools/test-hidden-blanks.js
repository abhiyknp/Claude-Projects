// A detail the owner has not filled in must never show to customers: no "[to add]", "undefined", "null", "NaN", no empty
// labels or stray commas on the policy pages and product pages. Filled-in details must still show. Needs tools/preview.sh running.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fails = [];
const ok = (label, cond) => { console.log(label, cond ? 'ok' : 'FAIL'); if (!cond) fails.push(label); };
const BAD = [/\[to add\]/i, /\bundefined\b/, /\bnull\b/, /\bNaN\b/, /,\s*,/, /:\s*\./, /Courts in\s+have/, /Last updated:\s*\./, /Grievance officer:\s*[.,]/];
(async () => {
  const b = await chromium.launch(); const base = 'http://localhost:8765/page.html';
  const visit = async (settings, hash, wait) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.BT_CONFIG = {};' }));
    await p.addInitScript((cfg) => { try { localStorage.setItem('bt-proto-v2', JSON.stringify({ db: { settings: cfg } })); localStorage.setItem('bt-consent', 'no'); } catch (e) {} }, settings);
    await p.goto(base + hash); await p.waitForTimeout(wait || 1200);
    // the product page keeps its pack details in a closed section; open it before reading the page
    const text = async () => { try { await p.locator('text=Pack details').first().click({ timeout: 1500 }); await p.waitForTimeout(300); } catch (e) {} return p.evaluate(() => document.body.innerText); };
    return { p, ctx, errs, text };
  };
  const BLANK = { bizName: '', bizAddress: '', gstin: '', grievanceName: '', grievancePhone: '', courtCity: '', policyDate: '', email: '' };
  const FULL = { bizName: 'Test Maker', bizAddress: '1 Test Road', gstin: '', grievanceName: 'Test Officer', grievancePhone: '9000000001', courtCity: 'Testville', policyDate: '5 May 2030', email: 'a@b.test' };

  for (const h of ['#privacy', '#terms', '#shipping', '#refunds']) {
    const v = await visit(BLANK, h); const t = await v.text();
    ok(h + ' blank: has content', t.length > 800);
    for (const re of BAD) ok(h + ' blank: no ' + re, !re.test(t));
    ok(h + ' blank: no page errors', v.errs.length === 0); await v.ctx.close();
  }
  // a product page
  let v = await visit(BLANK, '#shop'); const href = await v.p.evaluate(() => (document.querySelector('a[href^="#p-"]') || {}).getAttribute?.('href') || ''); await v.ctx.close();
  ok('found a product to open', /^#p-/.test(href));
  v = await visit(BLANK, href); let t = await v.text();
  ok('product blank: pack details still show', /Net quantity/.test(t) && /MRP/.test(t) && /Country of origin/.test(t));
  ok('product blank: no "Made and packed by" or "Consumer care" row without details', !/Made and packed by/.test(t) && !/Consumer care/.test(t));
  for (const re of BAD) ok('product blank: no ' + re, !re.test(t));
  ok('product blank: no page errors', v.errs.length === 0); await v.ctx.close();

  // filled in: the details do show
  v = await visit(FULL, '#privacy'); t = await v.text();
  ok('privacy filled: business name', /Test Maker/.test(t)); ok('privacy filled: grievance officer', /Test Officer/.test(t) && /9000000001/.test(t)); ok('privacy filled: date', /5 May 2030/.test(t));
  ok('privacy filled: no gaps', !BAD.some((re) => re.test(t))); await v.ctx.close();
  v = await visit(FULL, '#terms'); t = await v.text(); ok('terms filled: court city', /Courts in Testville/.test(t)); await v.ctx.close();
  v = await visit(FULL, href); t = await v.text(); ok('product filled: made and packed by', /Made and packed by/.test(t) && /Test Maker/.test(t)); ok('product filled: consumer care', /Consumer care/.test(t) && /Test Officer/.test(t)); await v.ctx.close();

  // some details filled, some not: the list keeps what exists
  v = await visit({ ...BLANK, grievanceName: 'Only Name', email: 'x@y.test' }, '#privacy'); t = await v.text();
  ok('partial: keeps the name and email', /Only Name/.test(t) && /x@y\.test/.test(t)); ok('partial: no gaps', !BAD.some((re) => re.test(t))); await v.ctx.close();
  // the Owner view says what is empty
  v = await visit(BLANK, '#admin'); t = await v.text();
  ok('owner view: lists the empty details', /Empty, so hidden from customers/.test(t) && /Business name/i.test(t));
  await v.ctx.close();
  v = await visit(FULL, '#admin'); t = await v.text();
  ok('owner view: no list when nothing is empty', !/Empty, so hidden from customers/.test(t)); await v.ctx.close();
  await b.close();
  if (fails.length) { console.log('FAILED:', fails.join(' | ')); process.exit(1); }
  console.log('Hidden-blanks checks passed.');
})();
