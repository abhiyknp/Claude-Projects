// The security policy added to the built site: the shop may frame its own pages (Owner view → Live preview) and Razorpay's
// payment window, and nothing else. A frame-src without 'self' makes the Live preview show "This content is blocked".
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-')); const f = path.join(dir, 'index.html');
fs.writeFileSync(f, '<!doctype html><html><head><meta charset="utf-8"><title>x</title></head><body><script>var a=1</script></body></html>');
execFileSync('node', [path.join(__dirname, 'add-csp.js'), f], { stdio: 'pipe' });
const html = fs.readFileSync(f, 'utf8'); const csp = /Content-Security-Policy" content="([^"]+)"/.exec(html)[1].replace(/&quot;/g, '"');
const frame = (/frame-src ([^;]+)/.exec(csp) || [])[1] || ''; let fails = 0;
const ok = (l, c) => { console.log(l, c ? 'ok' : 'FAIL'); if (!c) fails++; };
ok('the shop may frame its own pages (Live preview)', /(^| )'self'( |$)/.test(frame));
ok('the Razorpay payment window is still allowed', /https:\/\/checkout\.razorpay\.com/.test(frame) && /https:\/\/api\.razorpay\.com/.test(frame));
ok('no other site may be framed', frame.split(' ').every((x) => x === "'self'" || /^https:\/\/(api|checkout)\.razorpay\.com$/.test(x)), frame);
ok('scripts still only from the site, Razorpay and the exact inline scripts', /script-src 'self'[^;]*sha256-/.test(csp) && !/unsafe-eval/.test(csp));
fs.rmSync(dir, { recursive: true, force: true });
if (fails) process.exit(1); console.log('Security policy checks passed.');
