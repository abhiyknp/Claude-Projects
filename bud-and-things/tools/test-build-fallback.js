// When the database answers 503 at build time: robots.txt and sitemap.xml still get written, a normal build goes on
// (exit 0), and the daily rebuild (BT_REQUIRE_DB=1) stops (exit 1) so the last good site stays online.
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process');
const srv = http.createServer((q, r) => { r.statusCode = 503; r.end('down'); });
const run = (port, extra) => new Promise((resolve) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'btb-'));
  const p = spawn('node', [path.join(__dirname, 'build-pinterest.js'), dir], { env: { ...process.env, BT_SUPABASE_URL: 'http://127.0.0.1:' + port, BT_SUPABASE_KEY: 'x', BT_RETRY_WAIT_MS: '5', ...extra } });
  const timer = setTimeout(() => p.kill(), 30000);
  p.on('close', (code) => { clearTimeout(timer); resolve({ dir, code }); });
});
srv.listen(0, async () => {
  const port = srv.address().port; const bad = [];
  const a = await run(port, {});
  if (a.code !== 0) bad.push('a normal build must go on when the database is down (exit ' + a.code + ')');
  for (const f of ['robots.txt', 'sitemap.xml']) if (!fs.existsSync(path.join(a.dir, f))) bad.push(f + ' missing');
  if (fs.existsSync(path.join(a.dir, 'sitemap.xml')) && !/<loc>https:\/\/budandthings\.com\/<\/loc>/.test(fs.readFileSync(path.join(a.dir, 'sitemap.xml'), 'utf8'))) bad.push('sitemap has no home page');
  const b = await run(port, { BT_REQUIRE_DB: '1' });
  if (b.code !== 1) bad.push('the daily rebuild must stop when the database is down (exit ' + b.code + ')');
  srv.close();
  if (bad.length) { console.error('FAIL:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('Build fallback checks passed.');
});
