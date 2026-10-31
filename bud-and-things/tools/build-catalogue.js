// Adds a plain "Our pieces" list (photo, name, price) to the built home page, so visitors, search engines and the
// payment provider's reviewers can see what is for sale while the shop itself still shows the Coming soon page.
// No cart, no sign-in, no script: just HTML. The list comes from data/catalogue.public.json (the rows of the product
// sheet that are marked "Show on website" and have a price).
//   node bud-and-things/tools/build-catalogue.js _site            (run by .github/workflows/pages.yml)
// When the shop opens (Coming soon switched off), remove the "Add the Our pieces list" step from pages.yml.
const fs = require('fs'), path = require('path');
const dir = process.argv[2]; if (!dir) { console.error('usage: build-catalogue.js <site folder>'); process.exit(1); }
const items = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'catalogue.public.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
const card = (p) => {
  const bits = [p.type, p.colour, p.scent && 'Scent: ' + p.scent, p.grams && p.grams + ' g'].filter(Boolean).map(esc).join(' · ');
  return `<li class="pc"><img src="${esc(p.image)}" alt="${esc(p.name)}${p.colour ? ', ' + esc(p.colour) : ''}" width="360" height="360" loading="lazy" decoding="async"><h3>${esc(p.name)}</h3><p class="pc-meta">${bits}</p><p class="pc-price">${money(p.price)}</p></li>`;
};
const css = `#pieces{background:#F8F0E4;color:#150206;padding:56px 16px 64px;font-family:'Montserrat','Segoe UI',system-ui,sans-serif}
#pieces .pw{max-width:1180px;margin:0 auto}#pieces h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:clamp(28px,5vw,40px);margin:0 0 8px;color:#7A1229}
#pieces .pi{margin:0 0 28px;max-width:60ch;line-height:1.55}#pieces ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:20px}
#pieces .pc{background:#fff;border:1px solid #E6D3B3;border-radius:6px;overflow:hidden;display:flex;flex-direction:column}
#pieces .pc img{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;background:#EFE3CF}
#pieces h3{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:14px 14px 4px}
#pieces .pc-meta{font-size:13px;line-height:1.45;margin:0 14px 10px;color:#4a3a3d;flex:1}#pieces .pc-price{font-weight:600;font-size:18px;margin:0 14px 16px;color:#8F1834}
#pieces .pn{margin:28px 0 0;font-size:14px}#pieces a{color:#8F1834}`;
const section = `<section id="pieces" aria-labelledby="pieces-h"><style>${css}</style><div class="pw"><h2 id="pieces-h">Our pieces</h2><p class="pi">Handmade candles, made in small batches. Prices are per piece, in Indian rupees. Online ordering opens soon.</p><ul>${items.map(card).join('')}</ul><p class="pn">To enquire or order before we open, write to <a href="mailto:hello@budandthings.com">hello@budandthings.com</a>.</p></div></section>`;
const file = path.join(dir, 'index.html');
const html = fs.readFileSync(file, 'utf8');
if (!/<main id="app"[^>]*><\/main>/.test(html)) { console.error('build-catalogue: app container not found; leaving the page as it is'); process.exit(1); }
fs.writeFileSync(file, html.replace(/(<main id="app"[^>]*><\/main>)/, (m) => m + '\n' + section));
console.log(`build-catalogue: ${items.length} pieces added`);
