#!/usr/bin/env node
/* Lints the content in social/: caption limits, calendar links, banned claims, private details, real prices.
   Run from anywhere: node bud-and-things/social/check.js   (exit code 1 on any problem) */
const fs = require('fs'), path = require('path');
const R = __dirname, BT = path.resolve(R, '..');
const rd = (p) => fs.readFileSync(path.join(R, p), 'utf8');
let bad = 0; const err = (m) => { bad++; console.log('FAIL ' + m); };

const LIMIT = { IG: 2200, YT: 5000, PIN: 800 };
const blocks = (txt) => [...txt.matchAll(/^### ([\w-]+)[^\n]*\n```text\n([\s\S]*?)```/gm)].map((m) => ({ id: m[1], body: m[2].trimEnd() }));
const ids = new Set(), all = [];
for (const f of ['captions/instagram.md', 'captions/youtube-pinterest.md']) for (const b of blocks(rd(f))) { ids.add(b.id); all.push({ ...b, f }); }
for (const b of all) {
  const kind = b.id.endsWith('-IG') || b.id.startsWith('FB-') ? 'IG' : b.id.endsWith('-YT') ? 'YT' : 'PIN';
  const len = [...b.body].length;
  if (len > LIMIT[kind]) err(`${b.id}: ${len} chars > ${LIMIT[kind]}`);
  if (kind === 'YT' && [...b.body.split('\n')[0]].length > 100) err(`${b.id}: YouTube title over 100`);
  if (kind === 'PIN') { const [t, , ...d] = b.body.split('\n'); if ([...t].length > 100) err(`${b.id}: pin title over 100`); if ([...d.join(' ')].length > 500) err(`${b.id}: pin description over 500`); }
  if (kind === 'IG') { const n = (b.body.match(/#\w+/g) || []).length; if (n > 5) err(`${b.id}: ${n} hashtags (max 5)`); if (n < 3) err(`${b.id}: fewer than 3 hashtags`); }
}
console.log(`captions: ${all.length} blocks checked`);

// calendar: every referenced ID exists; every day 17 Nov to 31 Dec present
const cal = rd('CALENDAR.md');
const used = [...cal.matchAll(/`((?:\d{4}-(?:IG|YT|PIN))|FB-C\d)`/g)].map((m) => m[1]);
for (const u of used) if (!ids.has(u)) err(`calendar references missing caption ${u}`);
const days = [...cal.matchAll(/^\| \*{0,2}(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d+) (Nov|Dec)\*{0,2} \|/gm)].map((m) => m[2] + m[1]);
const want = []; for (let d = 14; d <= 30; d++) want.push('Nov' + d); for (let d = 1; d <= 31; d++) want.push('Dec' + d);
for (const w of want) if (!days.includes(w)) err(`calendar missing day ${w}`);
const IGrows = [...cal.matchAll(/`(\d{4})-IG`/g)].map((m) => m[1]);
console.log(`calendar: ${days.length} days, ${new Set(IGrows).size} caption IDs`);

// stories file: one row per day 1117..1231, status <700, channel <300
const st = rd('captions/stories-status.md'); const rows = [...st.matchAll(/^\| (\d{4}) \| (.*?) \| (.*?) \| (.*?) \|$/gm)];
const dd = []; for (let d = 17; d <= 30; d++) dd.push('11' + d); for (let d = 1; d <= 31; d++) dd.push('12' + String(d).padStart(2, '0'));
for (const d of dd) if (!rows.find((r) => r[1] === d)) err(`stories-status missing ${d}`);
for (const r of rows) { if (r[3].length > 700) err(`${r[1]} status too long`); if (r[4].length > 300) err(`${r[1]} channel too long`); }
console.log(`stories-status: ${rows.length} days`);

// account setup: bio 150, name 64
const acct = rd('ACCOUNT_SETUP.md');
for (const m of acct.matchAll(/^### (BIO-\d|NAME-\d)[^\n]*\n```text\n([\s\S]*?)```/gm)) { const t = m[2].trimEnd(), lim = m[1].startsWith('BIO') ? 150 : 64, len = [...t].length; if (len > lim) err(`${m[1]}: ${len} chars > ${lim}`); else console.log(`${m[1]}: ${len}/${lim}`); }

// reels
for (let i = 1; i <= 10; i++) { const f = fs.readdirSync(path.join(R, 'reels')).find((x) => x.startsWith(String(i).padStart(2, '0') + '-')); if (!f) { err(`reel ${i} missing`); continue; }
  const t = rd('reels/' + f); for (const k of ['**Hook (0 to 2 s)', '| # | Time | Shot', 'Audio mood', 'CTA', 'Honesty checks']) if (!t.includes(k)) err(`${f}: missing "${k}"`); }

// banned claims and private details across authored copy (not the rules that list them)
const copy = [...all.map((b) => [b.id, b.body]), ...rows.map((r) => [r[1], r.slice(2).join(' ')])];
for (const f of ['OUTREACH.md', 'ACCOUNT_SETUP.md']) for (const m of rd(f).matchAll(/```text\n([\s\S]*?)```/g)) copy.push([f, m[1]]);
for (const f of fs.readdirSync(path.join(R, 'reels'))) if (/^\d\d-/.test(f)) copy.push([f, rd('reels/' + f).replace(/^\*\*Honesty checks:\*\*.*$/gm, '')]);
const BANNED = /\b(luxury|premium|best[- ]selling|no\.? ?1|organic|non-?toxic|eco-?friendly|toxin|aromatherapy|stress[- ]relie|therapy|hurry|last chance|selling fast|limited (stock|edition|time)|only \d+ left|clean[- ]burn|soy|paraffin|\d+\s*(hours|hrs) burn)\b/i;
const PRIVATE = /(\+?91[\s-]?\d{5}[\s-]?\d{5}|\b[6-9]\d{9}\b|@gmail|@yahoo|@outlook|\bflat\b|\bsector\s?\d|\bpin ?code\b\s*\d{6}|\b\d{6}\b)/i;
for (const [id, t] of copy) { const m = t.match(BANNED); if (m) err(`${id}: banned claim "${m[0]}"`); const p = t.match(PRIVATE); if (p) err(`${id}: looks like private contact detail "${p[0]}"`); }

// prices quoted next to catalogue names must match the catalogue
const prods = JSON.parse(fs.readFileSync(path.join(BT, 'catalogue/products.json'), 'utf8')).products;
const byName = {}; for (const p of prods) (byName[p.name.toLowerCase()] ||= new Set()).add(p.price);
for (const [id, t] of copy) for (const [name, set] of Object.entries(byName)) {
  const m = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^\\n|]{0,18}?₹\\s?([\\d,]+)', 'i').exec(t);
  if (m) { const v = +m[1].replace(/,/g, ''); if (!set.has(v)) err(`${id}: "${name}" quoted at ₹${v}, catalogue says ${[...set].join('/')}`); }
}
// templates sample data
try { for (const p of JSON.parse(rd('templates/posts.json'))) if (p.product && !prods.find((x) => x.id === p.product)) err(`posts.json: unknown product ${p.product}`); } catch (e) { err('posts.json: ' + e.message); }
console.log(bad ? `\n${bad} problem(s)` : '\nAll checks passed.'); process.exit(bad ? 1 : 0);
