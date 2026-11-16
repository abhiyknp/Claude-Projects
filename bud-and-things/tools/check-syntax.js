// A light "lint" for a project with no build step: every JavaScript file, and every inline script in the page, must
// parse; and the vendored library versions must match what prototype/vendor/VERSIONS.md says.
//   node bud-and-things/tools/check-syntax.js     (run from the repository root; also run by .github/workflows/audit.yml)
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..'), bad = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === 'node_modules' || e.name.startsWith('.') ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let n = 0;
for (const f of walk(root)) {
  const rel = path.relative(root, f);
  if (/^prototype\/vendor\//.test(rel)) continue; // third-party, checked by version below
  if (/\.js$/.test(f)) {
    n++; let src = fs.readFileSync(f, 'utf8').replace(/^#!.*/, '');
    if (/^\s*(import|export)\s/m.test(src)) { // an ES module: let node check it as one
      const t = path.join(os.tmpdir(), 'bt-check-' + process.pid + '.mjs'); fs.writeFileSync(t, src);
      const r = cp.spawnSync(process.execPath, ['--check', t], { encoding: 'utf8' }); fs.unlinkSync(t);
      if (r.status) bad.push(`${rel}: ${String(r.stderr).split('\n').find((l) => /Error/.test(l)) || 'does not parse'}`);
    } else try { new vm.Script(src, { filename: rel }); } catch (e) { bad.push(`${rel}: ${e.message}`); }
  }
  if (/\.html$/.test(f) && /^(prototype|catalogue)\//.test(rel)) {
    const html = fs.readFileSync(f, 'utf8'); let i = 0;
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      i++; if (/type="(application\/(ld\+)?json|importmap)"/.test(m[1])) { try { JSON.parse(m[2]); } catch (e) { bad.push(`${rel} script ${i}: bad JSON`); } continue; }
      if (/type="module"/.test(m[1])) continue;
      n++; try { new vm.Script(m[2], { filename: `${rel} script ${i}` }); } catch (e) { bad.push(`${rel} script ${i}: ${e.message}`); }
    }
  }
}
// vendored libraries versus the notes
const notes = fs.readFileSync(path.join(root, 'prototype/vendor/VERSIONS.md'), 'utf8');
const three = (fs.readFileSync(path.join(root, 'prototype/vendor/three/build/three.module.min.js'), 'utf8').match(/const t="(\d+)"/) || [])[1];
if (!three) bad.push('three.js: version not found in the build header');
else if (!new RegExp(`r${three}\\b`).test(notes)) bad.push(`three.js: file is r${three} but VERSIONS.md does not say r${three}`);
if (!/qrcode-generator\s*\|\s*2\.0\.4/.test(notes)) bad.push('VERSIONS.md no longer lists qrcode-generator 2.0.4');
if (bad.length) { console.error('Syntax check FAILED:\n' + bad.join('\n')); process.exit(1); }
console.log(`Syntax check passed: ${n} scripts parse; three.js r${three} matches VERSIONS.md.`);
