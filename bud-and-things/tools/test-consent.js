// Cookie consent banner: shows only while a Meta Pixel or Google Analytics id is set; ad tags load only after Accept. Needs tools/preview.sh running.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fails = [];
const expect = (label, got, want) => { console.log(label, got === want ? 'ok' : 'FAIL (got ' + got + ', want ' + want + ')'); if (got !== want) fails.push(label); };
(async()=>{
 const b=await chromium.launch(); const url='http://localhost:8765/page.html#home';
 const open=async(cfg,pre,ctx0)=>{
  const ctx=ctx0||await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage();
  const reqs=[]; p.on('request',r=>{if(/facebook\.net|googletagmanager/.test(r.url()))reqs.push(r.url().slice(0,45))});
  await p.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.BT_CONFIG = {};'}));
  await p.route(/facebook\.net|googletagmanager/,r=>r.fulfill({contentType:'text/javascript',body:''}));
  await p.addInitScript(([cfg,pre])=>{ try{ localStorage.setItem('bt-proto-v2',JSON.stringify({db:{settings:cfg}})); if(pre) localStorage.setItem('bt-consent',pre); }catch(e){} },[cfg,pre]);
  await p.goto(url); await p.waitForTimeout(1500);
  return {p,reqs,ctx};
 };
 const n=async(p,s)=>p.locator(s).count();
 let r=await open({metaPixel:'',gaId:''});
 expect('A banner', await n(r.p,'#bt-consent'), 0); expect('A ad requests', r.reqs.length, 0); await r.ctx.close();
 r=await open({metaPixel:'123456789',gaId:'G-ABC123'});
 expect('B bar shows', await n(r.p,'.cc-bar'), 1); expect('B no tags before choice', r.reqs.length, 0);
 await r.p.screenshot({path:'/tmp/claude-0/cc-bar.png'});
 await r.p.click('#cc-no'); await r.p.waitForTimeout(400);
 expect('B No: bar gone', await n(r.p,'.cc-bar'), 0); expect('B No: chip', await n(r.p,'.cc-chip'), 1); expect('B No: no tags', r.reqs.length, 0);
 await r.p.click('#cc-change'); await r.p.waitForTimeout(300);
 expect('B change choice reopens bar', await n(r.p,'.cc-bar'), 1);
 await r.p.click('#cc-yes'); await r.p.waitForTimeout(1200);
 expect('B Yes: bar gone', await n(r.p,'.cc-bar'), 0); expect('B Yes: both tags load', r.reqs.length, 2);
 await r.ctx.close();
 r=await open({metaPixel:'123456789',gaId:''},'yes');
 expect('C saved yes: no bar', await n(r.p,'.cc-bar'), 0); expect('C only pixel loads', r.reqs.length, 1); await r.ctx.close();
 r=await open({metaPixel:'',gaId:''},'yes');
 expect('D ids off: no banner or chip', await n(r.p,'#bt-consent'), 0); expect('D ids off: no tags', r.reqs.length, 0);
 await r.ctx.close(); await b.close();
 if (fails.length) { console.log('FAILED:', fails.join(', ')); process.exit(1); }
 console.log('consent: all ok');
})();
