// Renders catalogue/share/og-light.png from the lit Diwali scene. node tools/render-og-light.js (needs playwright)
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1200,height:630}});
await p.goto('file://'+require('path').resolve(__dirname,'../catalogue/light/index.html')+'#t=Priya&f=Riya&m=Happy+Diwali&p=bnt-prd-cg-002');await p.reload();await p.waitForTimeout(800);
await p.click('#open');await p.waitForTimeout(1200);await p.click('#match');await p.waitForTimeout(4200);
await p.evaluate(()=>{['head','hint','mute','blowbtn'].forEach(i=>{const e=document.getElementById(i);if(e)e.style.display='none'});
const d=document.createElement('div');d.style.cssText='position:fixed;left:0;right:0;top:70px;text-align:center;z-index:30;color:#F8F0E4;font-family:Playfair Display,serif';
d.innerHTML='<div style="font:600 13px Montserrat;letter-spacing:.3em;color:#D6A34A;text-transform:uppercase">Shubh Deepawali · BUD &amp; THINGS by Ashi</div><div style="font-weight:600;font-size:64px;line-height:1.1;margin-top:10px">Someone lit a <i style="color:#D6A34A;font-weight:500">diya</i> for you</div>';document.body.appendChild(d)});
await p.waitForTimeout(300);await p.screenshot({path:require('path').resolve(__dirname,'../catalogue/share/og-light.png')});await b.close()})()
