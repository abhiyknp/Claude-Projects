// Looks through every tracked file for things that must never be committed: payment keys, private keys, service-role tokens,
// email or Cloudinary secrets. The public Supabase anon key in config.js is allowed (it is public by design).
//   node bud-and-things/tools/scan-secrets.js            (run from the repository root; also run by .github/workflows/audit.yml)
const { execSync } = require('child_process'), fs = require('fs');
const files = execSync('git ls-files', { cwd: process.env.GIT_DIR_ROOT || undefined, maxBuffer: 1 << 26 }).toString().split('\n').filter(Boolean);
const rules = [
  ['Razorpay live key', /rzp_live_[A-Za-z0-9]{10,}/], ['Razorpay test key', /rzp_test_[A-Za-z0-9]{10,}/],
  ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/], ['Stripe-style live key', /sk_live_[A-Za-z0-9]{10,}/],
  ['Resend key', /\bre_[A-Za-z0-9]{24,}\b/], ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Secret assignment', /(?:key_secret|api_secret|webhook_secret|service_role_key|client_secret)["']?\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{16,}["']/i],
];
const bad = [];
for (const f of files) {
  if (/\.(png|jpe?g|webp|gif|ico|woff2?|xlsx|whl|mp4|pdf)$/i.test(f) || /^bud-and-things\/(prototype\/vendor|catalogue\/img)\//.test(f)) continue;
  let t; try { t = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
  for (const [name, re] of rules) { const m = t.match(re); if (m) bad.push(`${f}: ${name}`); }
  // any JWT must be the public anon token, never a service-role one
  for (const j of t.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || []) {
    try { const p = JSON.parse(Buffer.from(j.split('.')[1], 'base64url').toString()); if (p.role && p.role !== 'anon') bad.push(`${f}: token with role ${p.role}`); } catch (e) { /* not a token */ }
  }
}
if (bad.length) { console.error('Secret scan FAILED (values not shown):\n' + bad.join('\n')); process.exit(1); }
console.log(`Secret scan passed: ${files.length} tracked files checked.`);
