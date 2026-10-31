// Renders catalogue/share/og-story.png (link preview for /catalogue/diwali/). node tools/render-og-story.js (needs playwright)
const {chromium}=require('playwright');const path=require('path');
const R=p=>'file://'+path.resolve(__dirname,'..',p);
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1200,height:630}});
const tiles=['bnt-prd-cg-001','bnt-prd-tl-001','bnt-prd-mc-004','bnt-prd-jt-001'].map(i=>`<img src="${R('catalogue/img/'+i+'.jpg')}">`).join('');
const fs=require('fs'),os=require('os'),tmp=path.join(os.tmpdir(),'og-story.html');fs.writeFileSync(tmp,`<style>
@font-face{font-family:P;src:url(${R('prototype/assets/fonts/playfair.woff2')});font-weight:400 900}
@font-face{font-family:PI;src:url(${R('prototype/assets/fonts/playfair-italic.woff2')});font-weight:400 900}
@font-face{font-family:M;src:url(${R('prototype/assets/fonts/montserrat.woff2')});font-weight:100 900}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:radial-gradient(ellipse at 20% 0,#5a0f26,#150206 70%);color:#F8F0E4;display:flex;align-items:center;padding:0 70px;gap:56px;position:relative;overflow:hidden}
.fr{position:absolute;inset:18px;border:2px solid #D6A34A;border-radius:22px}
.e{font:600 14px M;letter-spacing:.3em;color:#D6A34A;text-transform:uppercase}
h1{font:600 84px/1.02 P;margin:16px 0 18px}h1 i{font:italic 500 84px/1.02 PI;color:#D6A34A}
.s{font:400 26px/1.4 M;opacity:.85}.u{font:600 24px M;color:#D6A34A;margin-top:26px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:none}.g img{width:200px;height:200px;object-fit:cover;border-radius:20px;border:2px solid #D6A34A}
.g img:nth-child(odd){transform:translateY(-14px)}.g img:nth-child(even){transform:translateY(14px)}
</style><div class="fr"></div><div><div class="e">Shubh Deepawali</div><h1>Diwali,<br><i>made by hand</i></h1><div class="s">Swipe through our handmade candles and trays</div><div class="u">budandthings.com/catalogue/diwali</div></div><div class="g">${tiles}</div>`);await pg.goto('file://'+tmp);
await pg.waitForTimeout(800);await pg.screenshot({path:path.resolve(__dirname,'../catalogue/share/og-story.png')});await b.close()})()
