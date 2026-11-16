// Runs test-functions.mjs. The functions are TypeScript for Deno; Node 22.6 or newer can run them directly for this test.
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 6)) { console.log('Function checks skipped: needs Node 22.6 or newer (this is ' + process.versions.node + ').'); process.exit(0); }
const r = require('child_process').spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', __dirname + '/test-functions.mjs'], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
