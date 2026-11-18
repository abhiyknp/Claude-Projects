/* BUD & THINGS festive looks. Off until the Owner applies one. Everything is namespaced ft-. */
(function(){'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg={products:()=>[],toast:()=>{},photo:'assets/pack-jar.webp',photos:[],assets:{}};
let routeOK=true;
const FX=.514,FY=.185,IW=1100,IH=733;
let thxAt=null,fest=null,fxRun=0,parts=[],bursts=[],scDispose=[];
const cv=document.createElement('canvas');cv.className='ftfx';cv.setAttribute('aria-hidden','true');const cx=cv.getContext('2d');const scene=document.createElement('div');scene.className='ft-scene';const tintEl=document.createElement('div');tintEl.className='ft-tint';
function fit(){const r=Math.min(devicePixelRatio||1,1.5);cv.width=innerWidth*r;cv.height=innerHeight*r;cx.setTransform(r,0,0,r,0,0)}addEventListener('resize',fit);fit();
const rnd=(a,b)=>a+Math.random()*(b-a);
function burst(x,y,cols,n,speed,grav,life){if(reduce)return;for(let i=0;i<n;i++){const a=Math.random()*6.283,v=rnd(.3,1)*speed;bursts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:grav,t:0,L:life*rnd(.7,1.1),c:cols[i%cols.length],r:rnd(1.4,3.2)})}loop()}
function confetti(x,y,n,spread){if(reduce)return;const cols=['#D6A34A','#f3dca6','#8F1834','#fff3dc','#e8a1b2'];for(let i=0;i<(n||90);i++){const a=-Math.PI/2+rnd(-1,1)*(spread||1.1);const v=rnd(4,11);bursts.push({k:'rect',x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:.2,t:0,L:rnd(2.2,3.6),c:cols[i%cols.length],r:rnd(3,6),s:rnd(0,6),sp:rnd(.1,.3)})}loop()}
function rocket(cols){if(reduce)return;const A=areaRect();if(!A)return;const bb=A.top+A.h;bursts.push({x:rnd(innerWidth*.15,innerWidth*.85),y:bb,vx:rnd(-.5,.5),vy:-rnd(3.6,4.6),g:.1,t:0,L:rnd(.6,.9),c:'#fff3dc',r:2,rk:1,cols:cols});loop()}
function cloud(x,y,cols,n){if(reduce)return;for(let i=0;i<n;i++){const a=rnd(0,6.28),v=rnd(.4,2.2);bursts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:-.005,t:0,L:rnd(1.6,2.6),c:cols[i%cols.length],r:rnd(18,44),soft:1})}loop()}
function areaH(){if(Date.now()<fullUntil)return innerHeight;const el=(homeOn&&layer&&layer.style.display!=='none')?layer:(strapOn&&strapEl&&strapEl.style.display!=='none'?strapEl:null);return el?Math.max(40,el.offsetHeight):innerHeight}
function spawn(kind,cols,fresh,gold){const w=innerWidth,h=areaH();const p={x:rnd(0,w),y:fresh?-20:rnd(0,h),r:rnd(1.5,4.2),vx:rnd(-.2,.2),vy:rnd(.4,1.3),s:rnd(0,6.28),c:cols[Math.floor(Math.random()*cols.length)],o:rnd(.3,.65),k:kind};
 if(kind==='snow'){const z=Math.random();if(z>.92){p.r=rnd(5,9);p.o=.22;p.vy=rnd(1.6,2.4)}else if(z>.7){p.r=rnd(2.5,4);p.o=.5;p.vy=rnd(.9,1.4)}else{p.r=rnd(.8,2);p.o=.7;p.vy=rnd(.3,.7)}}
 if(kind==='petal'||kind==='heart'||kind==='lantern'||kind==='bubble'){p.y=fresh?h+20:p.y;p.vy=-rnd(.3,.9)}
 if(kind==='petal'){p.vy=rnd(.4,1);p.y=fresh?-20:p.y;p.r=rnd(4,8)}
 if(kind==='heart'){p.r=rnd(6,12);p.o=rnd(.4,.8)}
 if(kind==='lantern'){p.r=rnd(8,13);p.vy=-rnd(.25,.55);p.o=.85}
 if(kind==='bubble'){p.r=rnd(2,6);p.o=rnd(.25,.5)}
 if(kind==='spark'||kind==='star'){p.vy=0;p.vx=0;p.t=rnd(0,6.28);p.r=rnd(1,2.4)}
 if(gold&&kind==='snow'){p.gold=1;p.r=rnd(2.6,5);p.o=rnd(.65,.95);p.vy=rnd(.7,1.7);p.vx=rnd(-.4,.4)}
 return p}
function drawHeart(x,y,r){cx.beginPath();cx.moveTo(x,y+r*.35);cx.bezierCurveTo(x-r,y-r*.5,x-r*.6,y-r*1.1,x,y-r*.45);cx.bezierCurveTo(x+r*.6,y-r*1.1,x+r,y-r*.5,x,y+r*.35);cx.fill()}
const SS={};function snowSprite(k){if(SS[k])return SS[k];const S=64,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
 if(k==='near'){const r=g.createRadialGradient(32,32,2,32,32,30);r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(.5,'rgba(232,242,252,.55)');r.addColorStop(1,'rgba(200,220,245,0)');g.fillStyle=r;g.fillRect(0,0,S,S)}
 else{g.beginPath();g.arc(32,32,28,0,6.283);const r=g.createRadialGradient(24,21,2,32,32,28);r.addColorStop(0,'#ffffff');r.addColorStop(.5,'#f2f7fd');r.addColorStop(.88,'#c9d9ec');r.addColorStop(1,'rgba(150,178,212,.9)');g.fillStyle=r;g.fill()}
 return SS[k]=c}
const GS={};function gs(c){if(GS[c])return GS[c];const k=document.createElement('canvas');k.width=k.height=64;const g=k.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,c);r.addColorStop(.25,c);r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.globalAlpha=1;g.fillRect(0,0,64,64);return GS[c]=k}
function hex2rgba(h,a){const n=parseInt(h.slice(1),16);return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')'}
let wind=0;
function loop(){if(fxRun)return;fxRun=1;requestAnimationFrame(step)}
let fullUntil=0,strapEl=null,footEl=null,homeOn=false,strapOn=false,fading=false,cvLast='',clockT=0;
function areaRect(){if(!fest)return null;let el=null;if(homeOn&&layer&&layer.style.display!=='none')el=layer;else if(strapOn&&strapEl&&strapEl.style.display!=='none')el=strapEl;if(!el)return null;const r=el.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight||r.height<8)return null;return{top:r.top,h:r.height}}
function step(){if(document.hidden){fxRun=0;return}
 const topc=!!thxAt||cv.classList.contains('ft-top'),t0=Date.now(),full=topc||(!!fest&&t0<fullUntil);
 const A=full?{top:0,h:innerHeight}:areaRect();
 if(!topc&&fest&&t0<fullUntil&&t0>fullUntil-600)fading=true;else if(fading&&t0>=fullUntil){fading=false;parts=parts.slice(0,Math.ceil(parts.length*.4))}
 const want=fading?'0':'1';if(cvLast!==want){cvLast=want;cv.style.opacity=want}
 cx.clearRect(0,0,innerWidth,innerHeight);
 const clipOn=!full&&!!A&&!!fest;const lim=A?A.h:innerHeight;
 cx.save();if(clipOn){cx.beginPath();cx.rect(0,A.top,innerWidth,A.h);cx.clip();cx.translate(0,A.top)}
 wind=Math.sin(Date.now()/4000)*.35;cx.globalCompositeOperation='source-over';
 if(fest&&!full&&!A)parts.forEach(p=>{p.s+=.02});
 for(const p of ((fest&&!full&&!A)?[]:parts)){p.s+=.02;const k=p.k;
  if(k==='snow'){p.x+=p.vx+Math.sin(p.s)*.4+wind*(p.r/3+.3);p.y+=p.vy;cx.globalAlpha=p.o;cx.drawImage(p.gold?gs('rgba(214,163,74,1)'):snowSprite(p.r>4?'near':'ball'),p.x-p.r*(p.r>4?2.2:1.6),p.y-p.r*(p.r>4?2.2:1.6),p.r*(p.r>4?4.4:3.2),p.r*(p.r>4?4.4:3.2));if(p.x>innerWidth+30)p.x=-20;if(p.x<-30)p.x=innerWidth+20;if(p.y>lim+10)Object.assign(p,spawn(k,fest.col,true,p.gold))}
  else if(k==='petal'){p.x+=p.vx+Math.sin(p.s)*.8;p.y+=p.vy;cx.globalAlpha=p.o+.2;cx.fillStyle=p.c;cx.save();cx.translate(p.x,p.y);cx.rotate(p.s);cx.beginPath();cx.ellipse(0,0,p.r,p.r*.55,0,0,6.28);cx.fill();cx.restore();if(p.y>lim+20)Object.assign(p,spawn(k,fest.col,true))}
  else if(k==='heart'){p.x+=Math.sin(p.s)*.5;p.y+=p.vy;cx.globalAlpha=p.o;cx.fillStyle=p.c;drawHeart(p.x,p.y,p.r);if(p.y<-30)Object.assign(p,spawn(k,fest.col,true))}
  else if(k==='lantern'){p.x+=Math.sin(p.s)*.35;p.y+=p.vy;const f=.8+Math.sin(p.s*3)*.2,g=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3);g.addColorStop(0,'rgba(255,190,80,'+.55*f+')');g.addColorStop(1,'rgba(255,140,30,0)');cx.globalAlpha=1;cx.fillStyle=g;cx.beginPath();cx.arc(p.x,p.y,p.r*3,0,6.28);cx.fill();cx.fillStyle='rgba(255,214,120,'+(.85*f)+')';cx.beginPath();cx.roundRect?cx.roundRect(p.x-p.r*.55,p.y-p.r*.8,p.r*1.1,p.r*1.6,3):cx.rect(p.x-p.r*.55,p.y-p.r*.8,p.r*1.1,p.r*1.6);cx.fill();if(p.y<-40)Object.assign(p,spawn(k,fest.col,true))}
  else if(k==='bubble'){p.x+=Math.sin(p.s)*.3;p.y+=p.vy;cx.globalAlpha=p.o;cx.strokeStyle=p.c;cx.lineWidth=1;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);cx.stroke();if(p.y<-10)Object.assign(p,spawn(k,fest.col,true))}
  else{p.t+=.012;cx.globalAlpha=.25+.75*(.5+.5*Math.sin(p.t));cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.28);cx.fill()}}
 cx.restore();cx.save();if(clipOn){cx.beginPath();cx.rect(0,A.top,innerWidth,A.h);cx.clip()}
 if(fest&&fest.id==='xmas'){const sl=scene.querySelector('.ft-sleigh');if(sl){const r=sl.getBoundingClientRect();if(r.right>0&&r.left<innerWidth&&getComputedStyle(sl).opacity>.1){for(let q=0;q<3;q++)bursts.push({x:r.left+r.width*.18+rnd(-6,6),y:r.top+r.height*.7+rnd(-8,8),vx:rnd(-.7,-.1),vy:rnd(.1,.7),g:.01,t:0,L:rnd(.8,1.5),c:['#ffd36a','#fff3dc','#ffe9ad'][q%3],r:rnd(.8,2.2)})}}}
 for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.t+=1/60;b.x+=b.vx;b.y+=b.vy;b.vy+=b.g;b.vx*=b.k==='rect'?.99:.985;const a=Math.max(0,1-b.t/b.L);
  if(b.rk&&b.t>0&&a<=.02){burst(b.x,b.y,b.cols,64,3,.03,2.3)}
  if(b.rk&&a>0){bursts.push({x:b.x,y:b.y,vx:rnd(-.3,.3),vy:rnd(0,.6),g:.02,t:0,L:.7,c:'#ffe9ad',r:1.3})}
  if(a<=0){bursts.splice(i,1);continue}
  cx.globalAlpha=a*(b.soft?.28:.9);cx.fillStyle=b.c;
  if(!b.k&&!b.soft&&b.c[0]==='#'){cx.globalCompositeOperation='lighter';const sz=b.r*(b.big||7)*(.5+a*.5);cx.globalAlpha=a;cx.drawImage(gs(hex2rgba(b.c,1)),b.x-sz/2,b.y-sz/2,sz,sz);cx.globalCompositeOperation='source-over'}
  else if(b.k==='rect'){b.s=(b.s||0)+b.sp;cx.save();cx.translate(b.x,b.y);cx.rotate(b.s);cx.scale(1,Math.abs(Math.sin(b.s*1.7))+.25);cx.fillRect(-b.r,-b.r*.5,b.r*2,b.r);cx.restore()}
  else{cx.beginPath();cx.arc(b.x,b.y,b.r*(b.soft?1+(1-a)*.8:.6+a*.4),0,6.28);cx.fill()}}
 cx.restore();
 if(thxAt&&!reduce){for(let q=0;q<2;q++)bursts.push({x:thxAt.x+rnd(-5,5),y:thxAt.y-rnd(0,8),vx:rnd(-.5,.5)+Math.sin(Date.now()/900)*.25,vy:-rnd(.6,1.8),g:-.004,t:0,L:rnd(1.6,3.2),c:Math.random()>.5?'#ffb347':'#ffd98a',r:rnd(.6,1.6),big:5})}
 cx.globalAlpha=1;
 if(parts.length||bursts.length||thxAt)requestAnimationFrame(step);else fxRun=0}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(parts.length||bursts.length)){fxRun=0;loop()}});
const SQ={xmas:'Wrapped in ribbon, lit with love: the best gifts glow.',ny:'A new year, a clean wick, and one small flame to begin.',val:'Say it softly. A flame says it for you.',diw:'One diya lights another and loses nothing.',holi:'Colour is just joy that has been given room.',eid:'May your home be bright and your table full.',bday:'Another year, another reason to light something.'};
/* decor builders */
const el=(h)=>{const d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild};
function bulbs(cols,n){let c='';for(let i=0;i<n;i++){const x=(i+.5)/n*1200,y=14+Math.sin(i/n*Math.PI)*34;c+=`<circle cx="${x}" cy="${y+8}" r="5" fill="${cols[i%cols.length]}" style="animation:ft-bon .5s ${i*.12}s both,ft-tw 2.4s ${i*.12+.5}s ease-in-out infinite"/><circle cx="${x}" cy="${y+8}" r="11" fill="${cols[i%cols.length]}" opacity=".18"/>`}
 return `<svg class="ft-bulbs" viewBox="0 0 1200 84" preserveAspectRatio="none" aria-hidden="true"><path d="M0 14 Q600 100 1200 14" fill="none" stroke="rgba(243,220,166,.55)" stroke-width="1.5"/>${c}</svg>`}
function garland(cols,n){let c='';for(let i=0;i<n;i++){const x=(i+.5)/n*1200,y=10+Math.sin(i/n*Math.PI)*40;c+=`<circle cx="${x}" cy="${y+6}" r="9" fill="${cols[i%cols.length]}"/><circle cx="${x}" cy="${y+6}" r="4" fill="#fff3b0" opacity=".6"/>`}
 return `<svg class="ft-bulbs" viewBox="0 0 1200 84" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10 Q600 90 1200 10" fill="none" stroke="#4a6b2a" stroke-width="3"/>${c}</svg>`}
const giftSVG=(c1,c2)=>`<svg viewBox="0 0 62 62" width="62" height="62" aria-hidden="true"><rect x="6" y="26" width="50" height="32" rx="3" fill="${c1}"/><rect x="28" y="26" width="6" height="32" fill="${c2}"/><g class="ft-lid"><rect x="3" y="18" width="56" height="12" rx="3" fill="${c1}" stroke="rgba(0,0,0,.25)"/><rect x="28" y="18" width="6" height="12" fill="${c2}"/><path d="M31 18c-8-12-18-6-12 0M31 18c8-12 18-6 12 0" fill="none" stroke="${c2}" stroke-width="3"/></g></svg>`;
const sleighSVG=`<svg viewBox="0 0 360 130" aria-hidden="true"><g class="ft-bob">
 <g fill="#06010a"><ellipse cx="60" cy="58" rx="26" ry="11"/><path d="M82 52l14-14 4 4-6 14z"/><circle cx="100" cy="36" r="7"/><path d="M104 38l12 3-8 6z"/><path d="M96 30l-6-16m6 16l6-14m-10 4l-8-2m16 0l8-4" stroke="#06010a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M40 66l-12 26m22-24l-6 28m22-24l8 26m10-28l14 22" stroke="#06010a" stroke-width="4" stroke-linecap="round" fill="none"/></g>
 <g fill="#06010a" transform="translate(-92 6) scale(.9)"><ellipse cx="180" cy="58" rx="26" ry="11"/><path d="M202 52l14-14 4 4-6 14z"/><circle cx="220" cy="36" r="7"/><path d="M224 38l12 3-8 6z"/><path d="M216 30l-6-16m6 16l6-14m-10 4l-8-2m16 0l8-4" stroke="#06010a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M160 66l-12 26m22-24l-6 28m22-24l8 26m10-28l14 22" stroke="#06010a" stroke-width="4" stroke-linecap="round" fill="none"/></g>
 <path d="M118 56C170 50 205 54 236 70" stroke="#06010a" stroke-width="2" fill="none"/>
 <path d="M236 54c30 0 64 6 84 30 4 6-4 12-12 12h-70c-10-6-12-26-2-42z" fill="#06010a" stroke="#06010a" stroke-width="3"/>
 <path d="M226 104c40 8 100 8 120-6" stroke="#06010a" stroke-width="4" stroke-linecap="round" fill="none"/>
 <circle cx="296" cy="56" r="13" fill="#06010a"/><circle cx="296" cy="52" r="8" fill="#06010a"/><path d="M286 48l12-22 8 24z" fill="#06010a"/><circle cx="298" cy="24" r="5" fill="#06010a"/><path d="M288 56q8 8 16 0" stroke="#06010a" stroke-width="5" fill="none" stroke-linecap="round"/>
 <ellipse cx="256" cy="52" rx="20" ry="16" fill="#06010a" opacity=".95"/><path d="M246 40l20 24m0-24l-20 24" stroke="#06010a" stroke-width="3"/></g></svg>`;
function wishBox(ph,color,onGo){const b=el(`<form class="ft-wishbox ft-pe"><input maxlength="60" placeholder="${ph}" aria-label="${ph}"><button>Send</button></form>`);b.onsubmit=e=>{e.preventDefault();const v=b.firstChild.value.trim();if(!v)return;b.firstChild.value='';onGo(v)};return b}
function floatNote(text,color){const r=scene.getBoundingClientRect(),n=el(`<div style="position:absolute;left:${rnd(25,70)}%;bottom:70px;padding:8px 14px;border-radius:18px;font:italic 500 15px 'Playfair Display',serif;color:#fff3dc;background:rgba(21,2,6,.55);border:1px solid ${color};box-shadow:0 0 24px ${color};pointer-events:none"></div>`);n.textContent=text;scene.appendChild(n);
 if(reduce){setTimeout(()=>n.remove(),2500);return}n.animate([{transform:'translateY(0)',opacity:0},{opacity:1,offset:.15},{transform:`translateY(-${r.height*.7}px)`,opacity:0}],{duration:6500,easing:'ease-out'}).onfinish=()=>n.remove()}
function bokeh(cols,n,seed){let s='';for(let i=0;i<n;i++){const r=(Math.sin(i*12.9898+seed)*43758.5453)%1,a=Math.abs(r),b=Math.abs((Math.sin(i*78.233+seed)*12345.678)%1),sz=24+Math.abs((Math.sin(i*3.1+seed)*999)%1)*70;s+=`<span class="ft-bokeh" style="left:${a*100}%;top:${b*78}%;width:${sz}px;height:${sz}px;background:radial-gradient(circle,${cols[i%cols.length]},transparent 70%);--d:${5+(i%5)*1.7}s;--dl:${-(i%7)*.9}s"></span>`}return s}
/* the scenes */
const SCENES=[
 {id:'xmas',name:'Christmas',when:'25 December',m:11,d:25,line:'Snow falls, string lights twinkle and gifts wait to be opened.',h:'Wrapped with love this Christmas',ey:'Christmas edit',p:'Tap a gift to see an idea.',kind:'snow',col:['#ffffff','#fff3dc'],n:60,tint:'radial-gradient(120% 90% at 50% 0%,rgba(214,163,74,.35),rgba(143,24,52,.25) 60%,rgba(20,40,60,.35))',
  decor(){const a=[bokeh(['rgba(255,190,100,.7)','rgba(255,90,90,.5)','rgba(255,230,170,.6)','rgba(120,210,160,.45)'],16,1),bulbs(['#ff5a5f','#ffd36a','#fff3dc','#7ad0a0'],20)];[[8,34,'#8F1834'],[22,60,'#D6A34A'],[40,28,'#fff3dc'],[60,52,'#8F1834'],[78,36,'#D6A34A'],[92,62,'#7a1229']].forEach(([x,h,c])=>a.push(`<div class="ft-bauble" style="left:${x}%;--h:${h}px;--c:${c};animation-delay:${x/20}s"><i></i></div>`));
   if(cfg.assets&&cfg.assets.sleigh)a.push(`<img class="ft-sleigh" alt="" src="${esc(cfg.assets.sleigh)}" onerror="this.remove()">`);
   a.push(`<svg class="ft-drift" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40Q150 6 300 34T600 30T900 34T1200 26V70H0Z" fill="#f7f1e6"/><path d="M0 52Q200 24 400 48T800 44T1200 46V70H0Z" fill="#fff" opacity=".9"/></svg>`);
   const PP=(cfg.products()||[]).filter(p=>p&&p.name);const G0=PP[0],G1=PP[1]||PP[0];const gifts=PP.length?[[4,'#8F1834','#D6A34A',G1],[12,'#D6A34A','#8F1834',G0],[84,'#fff3dc','#8F1834',G1],[92,'#8F1834','#fff3dc',G0]]:[];
   gifts.forEach(([x,c1,c2,pr],i)=>a.push(`<button class="ft-gift ft-pe" data-i="${i}" style="left:${x}%" aria-label="Open a gift">${(cfg.photos&&cfg.photos.length)?`<img alt="" src="${esc(cfg.photos[i%cfg.photos.length])}" style="width:62px;height:62px;object-fit:cover;border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,.4);border:2px solid rgba(243,220,166,.85)">`:giftSVG(c1,c2)}<span class="ft-gp" style="${x<20?'left:0;transform:translate(0,10px)':x>80?'left:auto;right:0;transform:translate(0,10px)':''}">Gift idea: ${esc(pr.name)} · ₹${pr.price}<br>${pr.stock?'In stock':'Back soon'}</span></button>`));
   return a.join('')},
  init(){$$('.ft-gift',scene).forEach(g=>g.onclick=()=>{const was=g.classList.contains('open');$$('.ft-gift',scene).forEach(x=>x.classList.remove('open'));if(!was){g.classList.add('open');burst(g.getBoundingClientRect().left+31,g.getBoundingClientRect().top+10,['#ffd36a','#fff3dc','#ff5a5f'],18,1.8,.03,1.6)}})}},
 {id:'ny',name:'New Year',when:'1 January',m:0,d:1,line:'Soft fireworks, rising bubbles, and a wish to send up.',h:'Begin the year with a little light',ey:'New Year',p:'Send a wish and watch it rise.',kind:'bubble',col:['rgba(255,236,190,.9)','rgba(255,214,120,.8)'],n:30,tint:'radial-gradient(120% 90% at 50% 0%,rgba(214,163,74,.35),rgba(30,20,70,.4))',
  decor(){return bokeh(['rgba(255,214,120,.7)','rgba(255,160,200,.5)','rgba(150,200,255,.5)'],14,5)},
  kind2:'bubble',init(){const w=wishBox('Make a wish for the new year…','#ffd36a',v=>{floatNote(v,'#ffd36a');burst(innerWidth/2,innerHeight*.7,['#ffd36a','#fff3dc','#ff9ac0'],36,2.4,.02,2)});scene.appendChild(w);
   const R=()=>rocket([['#ffd36a','#fff3dc'],['#ff9ac0','#ffd36a'],['#9ad1ff','#fff3dc'],['#b7f0c0','#ffd36a']][Math.floor(Math.random()*4)]);setTimeout(R,900);const iv=setInterval(()=>{R();if(Math.random()>.5)setTimeout(R,350)},2300);scDispose.push(()=>clearInterval(iv));
   const nx=new Date(new Date().getFullYear()+1,0,1),dd=Math.ceil((nx-new Date())/864e5);SCENES[1].extra=dd+' days to go'}},
 {id:'val',name:"Valentine's Day",when:'14 February',m:1,d:14,line:'Hearts and rose petals drift up while the flame glows like a heartbeat.',h:'Say it with a flame',ey:"Valentine's edit",p:'Write a note for the gift card.',kind:'heart',kind2:'petal',col:['#e8a1b2','#f4c6d0','#c8506a','#ffd1dc'],n:44,tint:'radial-gradient(120% 90% at 50% 100%,rgba(200,80,106,.45),rgba(70,10,30,.3))',
  decor(){return bokeh(['rgba(255,150,180,.6)','rgba(255,200,215,.5)','rgba(255,110,140,.5)'],14,9)+`<svg style="position:absolute;left:-10px;top:60px;width:150px;opacity:.55" viewBox="0 0 150 200" aria-hidden="true"><path d="M10 0C70 40-10 90 60 130S40 190 120 200" fill="none" stroke="#f4c6d0" stroke-width="3"/></svg><svg style="position:absolute;right:-10px;bottom:70px;width:150px;opacity:.55;transform:scaleX(-1)" viewBox="0 0 150 200" aria-hidden="true"><path d="M10 0C70 40-10 90 60 130S40 190 120 200" fill="none" stroke="#f4c6d0" stroke-width="3"/></svg>`},
  init(){scene.classList.add('ft-beat');scDispose.push(()=>scene.classList.remove('ft-beat'));scene.appendChild(wishBox('Write a gift note…','#f4a0b8',v=>{floatNote(v,'#f4a0b8');burst(innerWidth/2,innerHeight*.7,['#f4a0b8','#ffd1dc','#c8506a'],30,2,.02,1.8)}))}},
 {id:'diw',name:'Diwali',when:'Date set by you each year',m:-1,d:0,line:'Marigold garlands, floating lanterns, and diyas for you to light.',h:'Light up their Diwali',ey:'Festival of lights',p:'Light all the diyas below.',kind:'lantern',col:['#ffc23d'],n:14,tint:'radial-gradient(120% 90% at 50% 100%,rgba(255,140,30,.45),rgba(90,20,10,.3))',
  decor(){const d=[bokeh(['rgba(255,170,60,.7)','rgba(255,120,30,.55)','rgba(255,220,120,.6)'],18,3),garland(['#ff9a1f','#ffc23d','#ff7a1a'],22)];let s='';for(let i=0;i<7;i++)s+=`<button class="ft-diya ft-pe" aria-label="Light a diya" aria-pressed="false"><span class="ft-fl"></span><svg viewBox="0 0 54 46" width="54" height="46" aria-hidden="true"><path d="M2 14h50c0 18-12 30-25 30S2 32 2 14z" fill="#c2551a" stroke="#D6A34A" stroke-width="2"/><path d="M10 20h34" stroke="#ffd36a" stroke-width="2" opacity=".7"/></svg></button>`;
   d.push(`<div class="ft-diyas">${s}</div><div class="ft-hintbar" id="ft-dh">Tap to light the diyas</div>`);return d.join('')},
  init(){scene.classList.remove('ft-warm');const ds=$$('.ft-diya',scene);ds.forEach(b=>b.onclick=()=>{b.classList.toggle('on');b.setAttribute('aria-pressed',b.classList.contains('on'));const r=b.getBoundingClientRect();if(b.classList.contains('on'))burst(r.left+27,r.top,['#ffd36a','#fff3b0'],8,1.2,.02,1);
   const all=ds.every(x=>x.classList.contains('on'));scene.querySelector('#ft-dh').textContent=all?'The room glows. Happy Diwali.':'Tap to light the diyas';if(all){scene.classList.add('ft-warm');burst(innerWidth/2,innerHeight*.55,['#ffd36a','#ff9a1f','#fff3b0'],90,3,.02,2.4);cfg.toast('The room glows. Happy Diwali.')}else scene.classList.remove('ft-warm')})}},
 {id:'holi',name:'Holi',when:'Date set by you each year',m:-1,d:0,line:'Soft colour clouds drift. Tap the photo for a burst of colour.',h:'Play with colour',ey:'Festival of colours',p:'Tap anywhere on the photo.',kind:'none',col:['#ff4f9a'],n:0,tint:'radial-gradient(120% 90% at 50% 50%,rgba(255,80,160,.25),rgba(60,200,255,.2))',
  decor(){return ['#ff4f9a','#ffd23f','#3fc5ff','#7be07a','#b06bff'].map((c,i)=>`<div class="ft-blob" style="width:34vw;height:34vw;left:${i*18-6}%;top:${[10,40,5,45,20][i]}%;background:${c};animation-delay:${-i*3}s"></div>`).join('')},
  init(){const f=e=>{if(!routeOK||e.clientY>bandBottom()||e.target.closest('a,button,input,select,textarea,label,dialog'))return;const C=['#ff4f9a','#ffd23f','#3fc5ff','#7be07a','#b06bff'];cloud(e.clientX,e.clientY,C,12);burst(e.clientX,e.clientY,C,90,3.2,.03,1.8)};document.addEventListener('click',f);scDispose.push(()=>document.removeEventListener('click',f))}},
 {id:'eid',name:'Eid',when:'Date set by you each year',m:-1,d:0,line:'A crescent moon, glowing lanterns and a sky of soft stars.',h:'Celebrate Eid with warmth',ey:'Eid Mubarak',p:'Lanterns for a gathering.',kind:'star',col:['#fff3dc','#ffd98a'],n:46,tint:'radial-gradient(120% 90% at 50% 0%,rgba(30,50,110,.4),rgba(214,163,74,.25))',
  decor(){return bokeh(['rgba(255,214,130,.55)','rgba(140,170,255,.4)'],10,7)+`<svg style="position:absolute;right:7%;top:12%;width:min(16vw,120px);filter:drop-shadow(0 0 22px rgba(255,214,120,.8))" viewBox="0 0 100 100" aria-hidden="true"><path d="M62 8A42 42 0 1 0 92 66 34 34 0 1 1 62 8z" fill="#ffe9ad"/><path d="M80 20l3 8 8 1-6 6 2 8-7-4-7 4 2-8-6-6 8-1z" fill="#ffe9ad"/></svg>`+[[10,70],[24,44],[70,52],[86,76]].map(([x,h],i)=>`<div class="ft-fanoos" style="left:${x}%;--h:${h}px;animation-delay:${i*.7}s"><i></i></div>`).join('')},
  init(){const iv=setInterval(()=>{if(reduce)return;const y=rnd(60,innerHeight*.35);bursts.push({x:rnd(innerWidth*.5,innerWidth),y:y,vx:-rnd(7,11),vy:rnd(1.5,3),g:0,t:0,L:.7,c:'#fff3dc',r:2.4,tr:1});loop()},4200);scDispose.push(()=>clearInterval(iv))}},
 {id:'bday',name:'Birthday and gifting',when:'Any day',m:-1,d:0,line:'Balloons float up. Pop one for a burst of confetti.',h:'Make it a birthday to remember',ey:'Gifts for every occasion',p:'Pop a balloon.',kind:'none',col:['#ffd36a'],n:0,tint:'radial-gradient(120% 90% at 50% 100%,rgba(255,160,90,.35),rgba(143,24,52,.25))',
  decor(){const fl=Array.from({length:18},(_,i)=>{const x=(i+.5)/18*1200,y=8+Math.sin(i/18*Math.PI)*34;return `<path d="M${x-16} ${y} L${x+16} ${y} L${x} ${y+32}Z" fill="${['#8F1834','#D6A34A','#f4a0b8','#7ad0a0','#fff3dc'][i%5]}"/>`}).join('');return `<svg class="ft-bunting" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 8Q600 52 1200 8" stroke="#f3dca6" stroke-width="1.5" fill="none"/>${fl}</svg>`+['#8F1834','#D6A34A','#f4a0b8','#7ad0a0','#fff3dc','#e0764a','#9ad1ff'].map((c,i)=>`<button class="ft-balloon ft-pe" aria-label="Pop a balloon" style="left:${6+i*13}%;--c:${c};--d:${14+i*1.7}s;--dl:${-i*2.4}s"><i></i></button>`).join('')},
  init(){$$('.ft-balloon',scene).forEach(b=>b.onclick=()=>{const r=b.getBoundingClientRect();burst(r.left+27,r.top+30,['#ffd36a','#f4a0b8','#8F1834','#9ad1ff','#7ad0a0'],40,2.4,.04,1.6);confetti(r.left+27,r.top+30,50,1.6);b.style.visibility='hidden';setTimeout(()=>b.style.visibility='',4000)})}}
];

/* ---- real-photo layer: photographed decorations replace drawn ones (CC0 photos, see assets/festive/CREDITS.md) ---- */
const AS=f=>(cfg.assets.base||'assets/festive/')+f;
const imgOrn=(x,h,f,w,i)=>`<div class="ft-orn${i%2?' ft-wide':''}" style="left:${x}%;--h:${h}px;width:${w}px;animation-delay:${-i*1.3}s"><img alt="" src="${AS(f)}" onerror="this.parentNode.remove()"></div>`;
const pick=()=>{const PP=(cfg.products()||[]).filter(p=>p&&p.name);return PP[0]||null};
const S_=id=>SCENES.find(s=>s.id===id);
const XM=S_('xmas');
XM.photo='intro-xmas.jpg';XM.band=[132,112];S_('ny').band=[120,108];S_('val').band=[88,88];S_('diw').band=[112,104];S_('holi').band=[92,88];S_('eid').band=[122,110];S_('bday').band=[100,96];const BG={xmas:'linear-gradient(180deg,#0d1d13,#1b2b1e 55%,#3a1018)',ny:'linear-gradient(180deg,#07071a,#1a0f2e)',val:'linear-gradient(180deg,#3a0a1c,#6a1a34)',diw:'linear-gradient(180deg,#240e05,#5a2208)',holi:'linear-gradient(90deg,#2b1346,#143a46)',eid:'linear-gradient(180deg,#0c1430,#2b2540)',bday:'linear-gradient(180deg,#3a1a10,#6a2a2a)'};SCENES.forEach(s=>s.bandBg=BG[s.id]||'');S_('diw').kind='spark';S_('diw').n=36;
XM.decor=function(){const a=[bokeh(['rgba(255,190,100,.7)','rgba(255,90,90,.45)','rgba(255,230,170,.6)'],12,1)];
 a.push(`<div class="ft-garland" style="background-image:url('${AS('garland.webp')}')"></div>`);
 [[5,14,'bauble-maroon.webp',40],[17,40,'bauble-gold.webp',44],[31,8,'bauble-silver.webp',36],[47,34,'bauble-maroon.webp',38],[62,12,'bauble-silver-2.webp',42],[74,44,'bauble-gold.webp',38]].forEach((o,i)=>a.push(imgOrn(...o,i)));
 a.push(`<svg class="ft-drift" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40Q150 6 300 34T600 30T900 34T1200 26V70H0Z" fill="#f7f1e6"/><path d="M0 52Q200 24 400 48T800 44T1200 46V70H0Z" fill="#fff" opacity=".9"/></svg>`);
 const ph=cfg.photos||[];[[2,0],[8,1]].forEach(([x,k],i)=>{const pr=pick();if(!pr||!ph.length)return;a.push(`<button class="ft-gift ft-pe" style="left:${x}%" aria-label="Open a gift"><img alt="" src="${esc(ph[k%ph.length])}" class="ft-gimg"><span class="ft-gp" style="left:0;transform:translate(0,10px)">Gift idea: ${esc(pr.name)} · ₹${pr.price}<br>In stock${pr.href?` · <a href="${esc(pr.href)}" style="color:#D6A34A">See it</a>`:''}</span></button>`)});
 const pr=pick();
 a.push(`<button class="ft-santa ft-pe" type="button" aria-label="Santa has a gift idea for you"><img alt="" src="${AS('santa.webp')}" onerror="this.parentNode.remove()">${pr?`<span class="ft-say">Ho ho ho! <strong>${esc(pr.name)}</strong> · ₹${pr.price}${pr.href?` <a href="${esc(pr.href)}">See it</a>`:''}</span>`:''}</button>`);
 return a.join('')};
const xInit=XM.init;XM.init=function(){xInit&&xInit();const s=scene.querySelector('.ft-santa');if(!s)return;
 s.onclick=e=>{if(e.target.closest('a'))return;s.classList.toggle('talk')};
 const t1=setTimeout(()=>{s.classList.add('talk');const r=s.getBoundingClientRect();burst(r.left+r.width*.3,r.top+r.height*.35,['#ffd36a','#fff3dc'],22,1.6,.02,1.4)},reduce?0:3000),t2=setTimeout(()=>s.classList.remove('talk'),reduce?8000:10000);scDispose.push(()=>{clearTimeout(t1);clearTimeout(t2)})};
S_('ny').photo='intro-ny.jpg';
S_('ny').decor=function(){return bokeh(['rgba(255,214,120,.7)','rgba(255,160,200,.5)','rgba(150,200,255,.5)'],14,5)+`<div class="ft-sky" style="background-image:url('${AS('fireworks.webp')}')"></div>`};
const VA=S_('val');VA.decor=function(){return bokeh(['rgba(255,150,180,.6)','rgba(255,200,215,.5)','rgba(255,110,140,.5)'],16,9)};
const EI=S_('eid');EI.photo='intro-eid.jpg';
EI.decor=function(){return bokeh(['rgba(255,214,130,.55)','rgba(140,170,255,.4)'],12,7)+[[4,8,'lantern-a.webp',50],[20,26,'lantern-b.webp',42],[38,4,'lantern-a.webp',46],[58,22,'lantern-b.webp',44],[76,10,'lantern-a.webp',48],[92,28,'lantern-b.webp',42]].map((o,i)=>imgOrn(...o,i).replace('ft-orn','ft-orn ft-lamp')).join('')};
const DI=S_('diw');DI.photo='intro-diwali.jpg';
DI.decor=function(){let z='';for(let i=0;i<7;i++)z+=`<button class="ft-zone ft-pe" style="left:${i*100/7}%;width:${100/7}%" aria-label="Light a lamp" aria-pressed="false"></button>`;
 return bokeh(['rgba(255,170,60,.7)','rgba(255,120,30,.55)','rgba(255,220,120,.6)'],14,3)+`<div class="ft-lamps" style="background-image:url('${AS('lamps-diwali.webp')}');--lit:0">${z}</div><div class="ft-hintbar" id="ft-dh">Tap the lamps to light them</div>`};
DI.init=function(){scene.classList.toggle('ft-warm',false);const band=scene.querySelector('.ft-lamps'),zs=$$('.ft-zone',scene);zs.forEach(b=>b.onclick=()=>{b.classList.toggle('on');b.setAttribute('aria-pressed',b.classList.contains('on'));const n=zs.filter(x=>x.classList.contains('on')).length;band.style.setProperty('--lit',n/7);const r=b.getBoundingClientRect();if(b.classList.contains('on'))burst(r.left+r.width/2,r.top+r.height*.4,['#ffd36a','#fff3b0'],12,1.4,.02,1.2);
 const all=n===7;scene.querySelector('#ft-dh').textContent=all?'The room glows. Happy Diwali.':'Tap the lamps to light them';scene.classList.toggle('ft-warm',all);if(all){burst(innerWidth/2,innerHeight*.6,['#ffd36a','#ff9a1f','#fff3b0'],90,3,.02,2.4);cfg.toast('The room glows. Happy Diwali.')}})};

SCENES.forEach(s=>{s.id==='holi'&&(s.hint='Holi 2027 is about 22 March. Check the calendar and apply it a day or two before.');s.id==='eid'&&(s.hint='Eid al-Fitr 2027 is about 10 March. It depends on the moon, so confirm the date.');s.id==='diw'&&(s.hint='Diwali date changes each year. Apply it a few days before.')});
SCENES.find(s=>s.id==='holi').when='About 22 March 2027';SCENES.find(s=>s.id==='eid').when='About 10 March 2027';
const CQ=['Light something small. Let the evening do the rest.','A candle is a quiet way of saying you matter.','Make a corner of today feel like a gift.','Warm rooms are made of small decisions.','Good things are poured slowly.','Some gifts are remembered by their glow.','Today is a good day to slow down.','Handmade means someone paused for you.','Choose the scent that sounds like your best memory.','A flame never asks for much. Just a moment.','Give someone a reason to exhale.','Soft light makes every room kinder.','What you light today, you carry into tomorrow.','Home is the place that smells like being looked after.','A gift note, a flame, a small celebration.','Keep a little warmth for yourself too.','The best evenings begin with a match.','Thoughtful beats expensive, every time.','Let the wick burn evenly, and the day too.','You do not need a reason to light a candle.','Be the one who remembers the small things.','Gratitude smells a little like vanilla.','Rest is also a kind of progress.','Share the glow, it never runs out.','Make the ordinary feel like an occasion.','Slow mornings, soft lights, kind words.','Wrap it like you mean it.','Something handmade is always on time.','A little light goes a long way.','Say thank you with something that stays lit.','The quiet part of the day is yours.'];
const THX=['Thank you for choosing something handmade.','Your order is in good hands.','Thank you for supporting a small business.','Something warm is on its way to you.'];
const OQ=['Small flames make big evenings.','Pack it like you would want to receive it.','A gift is a thought, held out in two hands.','Light first, hurry later.','Warmth is a habit. Start with one candle.','Make one person’s day feel looked after.','Good wax, good wicks, good mood.','Today’s order is somebody’s surprise.','Trim the wick, keep the glow.','Write the gift note by hand. They will keep it.'];
let qoff=0;const doy=()=>Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5);
function greet(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
function quote(){return fest&&SQ[fest.id]?{k:fest.name+' note',t:SQ[fest.id]}:{k:"Today's note · "+greet(),t:CQ[(doy()+qoff)%CQ.length]}}
let layer=null,titleEl=null;
function mount(){if(layer)return;layer=document.createElement('div');layer.id='ft-layer';titleEl=document.createElement('div');titleEl.className='ft-title';layer.appendChild(tintEl);layer.appendChild(scene);layer.appendChild(titleEl);document.body.appendChild(layer);document.body.appendChild(cv);fit()}
function introCard(o){const d=document.createElement('div');d.className='ft-intro'+(o.photo?' ph':'');d.setAttribute('role','presentation');d.innerHTML=(o.photo?'<div class="ft-ib" style="background-image:url(\''+AS(o.photo)+'\')"></div>':'')+'<div><div class="e">'+esc(o.ey)+'</div><h2>'+esc(o.name)+'</h2><p>'+esc(SQ[o.id]||o.line)+'</p></div>';document.body.appendChild(d);setTimeout(()=>d.remove(),3500)}
function start(id,opt){opt=opt||{};const o=SCENES.find(s=>s.id===id);if(!o){stop();return false}mount();stop(true);stopTok++;fest=o;document.body.classList.toggle('ft-anim',!!opt.preview);
 let seen=false;try{seen=sessionStorage.getItem('ft-seen-'+id)==='1'}catch(e){}
 fullUntil=0;if(!reduce&&(opt.intro||(!opt.preview&&!seen))){fullUntil=Date.now()+4600}try{if(!opt.preview)sessionStorage.setItem('ft-seen-'+id,'1')}catch(e){}
 scene.innerHTML=o.decor();layer.style.background=o.bandBg||'';tintEl.style.background=o.tint;document.body.classList.add('ft-scn');document.body.dataset.ftScene=o.id;
 titleEl.textContent='';mountStrap();renderStrap();
 const n=(innerWidth<640?.5:1)*o.n*(fullUntil?1.8:1);parts=reduce?[]:Array.from({length:Math.round(n)},(_,i)=>spawn(o.kind2&&i%3===0?o.kind2:o.kind,o.col,false));if(fullUntil&&!reduce)for(let q=0;q<(innerWidth<640?36:80);q++)parts.push(spawn('snow',o.col,false,o.id!=='xmas'));
 o.init();const tS=setTimeout(()=>{if(fest===o)parts=parts.slice(0,Math.ceil(parts.length*.5))},30000);scDispose.push(()=>clearTimeout(tS));page({home:homeOn,strap:strapOn});if(reduce)cfg.toast('Your device asks for less motion, so this look stays calm and still.');else if(parts.length)loop();return true}
let stopTok=0;function stop(quiet){scDispose.forEach(f=>f());scDispose=[];const was=!!fest;fest=null;fullUntil=0;fading=false;parts=[];bursts=[];fxRun=0;clearInterval(clockT);if(strapEl)strapEl.style.display='none';if(footEl)footEl.style.display='none';document.body.classList.remove('ft-hasstrap');cleanWorld();document.body.classList.remove('ft-scn');delete document.body.dataset.ftScene;if(!layer)return;titleEl.textContent='';const tok=++stopTok;const clear=()=>{if(tok!==stopTok)return;cx.clearRect(0,0,innerWidth,innerHeight);scene.innerHTML='';document.body.style.setProperty('--ft-band','0px')};if(quiet||!was||reduce)clear();else setTimeout(clear,700)}
let lastTop=0,pt=0;const bandH=()=>{const b=(fest&&fest.band)||[120,110];return innerWidth<640?b[1]:b[0]};function bandBottom(){return lastTop+bandH()-scrollY}
function place(){if(!layer)return;const h=(strapEl&&strapEl.style.display!=='none'&&strapOn)?strapEl:document.querySelector('.site-head');if(h&&scrollY<5){const r=h.getBoundingClientRect();lastTop=Math.max(0,Math.round(r.bottom));pt=0}else if(h&&pt++<8)setTimeout(place,150);layer.style.top=lastTop+'px';const b=bandH();layer.style.height=b+'px';document.body.style.setProperty('--ft-band',b+'px')}addEventListener('resize',place);
function setVisible(v){page({home:v,strap:v})}
function dismissed(){try{return sessionStorage.getItem('ft-sx')==='1'}catch(e){return false}}
function page(o){homeOn=!!o.home;strapOn=!!o.strap&&!dismissed();routeOK=homeOn||strapOn;if(!layer)return;
 const on=!!fest&&strapOn;if(strapEl){strapEl.style.display=on?'':'none';if(on)ensureStrap()}if(footEl){footEl.style.display=on?'':'none';if(on)ensureFoot()}
 document.body.classList.toggle('ft-hasstrap',on);
 layer.style.display=(homeOn&&fest)?'':'none';place();
 cv.style.display=(routeOK||bursts.length||fullUntil>Date.now())?'':'none';if(on)startClock();else clearInterval(clockT);watchWorld();decorate();if(fest&&!fxRun)loop()}

/* ---- the festive world (Christmas first): snow behind the page, snow caps, a Santa perched on the main button, lights, a hat on the logo ---- */
const SANTA='<span class="ft-sit" aria-hidden="true"><img alt="" src="assets/festive/santa-peek.webp" width="380" height="370" onerror="this.parentNode.remove()"></span>';
const HAT='<span class="ft-hat" aria-hidden="true"><svg viewBox="0 0 48 40" width="44" height="37"><path d="M6 30q-2-20 18-26t20 24q-10-8-20-7T6 30z" fill="#e0283f"/><path d="M6 30q-2-20 18-26" fill="none" stroke="#ff6b78" stroke-width="2" opacity=".6"/><rect x="4" y="27" width="40" height="9" rx="4.5" fill="#fff"/><path d="M40 8q8 3 7 13" stroke="#e0283f" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="46" cy="22" r="4.5" fill="#fff"/></svg></span>';
const WL={on:false,cv:null,cx:null,flakes:[],raf:0,mo:null,lights:null,t:0};
const worldWanted=()=>!!fest&&fest.id==='xmas'&&strapOn;
function wResize(){if(!WL.cv)return;const r=Math.min(devicePixelRatio||1,1.5);WL.cv.width=innerWidth*r;WL.cv.height=innerHeight*r;WL.cx.setTransform(r,0,0,r,0,0)}
function wFlake(top){const s=Math.random(),r=s>.88?rnd(3.8,6):s>.5?rnd(2.2,3.3):rnd(1.3,2.1);return{x:rnd(0,innerWidth),y:top?-10:rnd(0,innerHeight),r,vy:.25+r*.16+rnd(0,.25),ph:rnd(0,6.28),o:rnd(.8,1)}}
function wStart(){if(reduce)return;if(!WL.cv){WL.cv=document.createElement('canvas');WL.cv.className='ft-wcv';WL.cv.setAttribute('aria-hidden','true');document.body.appendChild(WL.cv);WL.cx=WL.cv.getContext('2d');addEventListener('resize',wResize)}
 wResize();WL.cv.style.display='';if(!WL.flakes.length)WL.flakes=Array.from({length:innerWidth<640?34:70},()=>wFlake(false));if(!WL.raf){WL.on=true;WL.raf=requestAnimationFrame(wLoop)}}
function wLoop(){if(!WL.on||document.hidden){WL.raf=0;if(WL.on)document.addEventListener('visibilitychange',wWake,{once:true});return}
 const c=WL.cx;c.clearRect(0,0,innerWidth,innerHeight);const wd=Math.sin(Date.now()/5000)*.4;
 const sy=scrollY,dsy=sy-(WL.sy==null?sy:WL.sy);WL.sy=sy;for(const f of WL.flakes){f.ph+=.012;f.y-=dsy*(.08+f.r*.07);if(f.y<-12)f.y=innerHeight+8;f.x+=Math.sin(f.ph)*.5+wd*(f.r/3);f.y+=f.vy;if(f.y>innerHeight+8){Object.assign(f,wFlake(true))}if(f.x>innerWidth+8)f.x=-8;if(f.x<-8)f.x=innerWidth+8;
  const near=f.r>3.3;c.globalAlpha=near?f.o*.8:f.o;const sz=near?f.r*5.2:f.r*2.7;c.drawImage(snowSprite(near?'near':'ball'),f.x-sz/2,f.y-sz/2,sz,sz)}
 c.globalAlpha=1;WL.raf=requestAnimationFrame(wLoop)}
function wWake(){if(WL.on&&!WL.raf)WL.raf=requestAnimationFrame(wLoop)}
function lightsEl(){if(WL.lights)return WL.lights;const cols=['#ff5a5f','#ffd36a','#fff3dc','#6fd0a0','#6aa8ff'];let b='';const n=34;for(let i=0;i<n;i++){const x=(i+.5)/n*1200,y=6+Math.sin((i+.5)/n*Math.PI*6)*0;const sag=7*Math.sin(((i%6)+.5)/6*Math.PI);b+=`<line x1="${x}" y1="${2+sag}" x2="${x}" y2="${5+sag}" stroke="#2a2a2a" stroke-width="1.6"/><circle cx="${x}" cy="${12+sag}" r="5.2" fill="${cols[i%5]}" style="animation:ft-tw 2.4s ${(i%7)*.35}s ease-in-out infinite"/><circle cx="${x}" cy="${12+sag}" r="10" fill="${cols[i%5]}" opacity=".2"/>`}
 const d=document.createElement('div');d.id='ft-lights';d.setAttribute('aria-hidden','true');d.innerHTML=`<svg viewBox="0 0 1200 30" preserveAspectRatio="none"><path d="M0 2 ${Array.from({length:6},(_,k)=>`Q${100+k*200} 11 ${(k+1)*200} 2`).join(' ')}" fill="none" stroke="#2a2a2a" stroke-width="1.6"/>${b}</svg>`;return WL.lights=d}
function pickSanta(app){const h=(location.hash||'#home').slice(1)||'home';let btn=null;
 if(h==='home')btn=app.querySelector('.gh-hero .gh-cta .btn:not(.ghost)');
 else if((h==='cart'||h==='gifting')&&innerWidth>=640)btn=app.querySelector('.btn:not(.ghost):not(.small)');
 return btn}
function decorate(){if(!worldWanted()){cleanWorld();return}const app=document.getElementById('app');if(!app)return;wStart();document.body.classList.add('ft-world');
 if(strapEl&&strapEl.style.display!=='none'&&strapEl.nextElementSibling!==lightsEl())strapEl.after(lightsEl());
 const lg=document.getElementById('cart-btn');if(lg&&!lg.querySelector('.ft-hat')){lg.classList.add('ft-lg');lg.insertAdjacentHTML('beforeend',HAT)}
 app.querySelectorAll('.card:not(.ft-capped)').forEach((el,i)=>{if(i<30){el.classList.add('ft-capped');el.insertAdjacentHTML('afterbegin','<i class="ft-cap" aria-hidden="true"></i>')}});
 app.querySelectorAll('.btn:not(.ghost):not(.small):not(.ft-capped)').forEach((el,i)=>{if(i<4&&!el.disabled){el.classList.add('ft-capped');el.insertAdjacentHTML('afterbegin','<i class="ft-cap ft-cap-s" aria-hidden="true"></i>')}});
 if(!app.querySelector('.ft-sit')){app.querySelectorAll('.ft-spacer').forEach(e=>e.remove());const b=pickSanta(app);if(b&&b.parentElement){b.classList.add('ft-host');const blk=b.closest('.gh-cta,.buy')||b;const sp=document.createElement('div');sp.className='ft-spacer';sp.setAttribute('aria-hidden','true');blk.parentNode.insertBefore(sp,blk);b.insertAdjacentHTML('beforeend',SANTA)}}}
function cleanWorld(){WL.on=false;if(WL.raf){cancelAnimationFrame(WL.raf);WL.raf=0}if(WL.cv)WL.cv.style.display='none';WL.flakes=[];document.body.classList.remove('ft-world');
 document.querySelectorAll('.ft-cap,.ft-sit,.ft-hat,.ft-spacer').forEach(e=>e.remove());document.querySelectorAll('.ft-capped,.ft-host,.ft-room,.ft-lg').forEach(e=>e.classList.remove('ft-capped','ft-host','ft-room','ft-lg'));if(WL.lights&&WL.lights.parentNode)WL.lights.remove()}
function watchWorld(){if(WL.mo)return;const app=document.getElementById('app');if(!app)return;let tm=0;WL.mo=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(decorate,60)});WL.mo.observe(app,{childList:true,subtree:true})}
/* ---- the offer strap (every page), the footer ribbon, and the clock ---- */
const SB={xmas:{bg:'garland.webp',orn:['bauble-maroon.webp','bauble-gold.webp','bauble-silver.webp']},ny:{bg:'fireworks.webp',orn:[]},eid:{orn:['lantern-a.webp','lantern-b.webp']},diw:{bg:'lamps-diwali.webp',orn:[]}};
const STXT={xmas:'Gift boxes wrapped by hand, with your note inside.',ny:'Begin the year with something that glows.',val:'A flame says it for you. Gifts wrapped with a note.',diw:'Light up their Diwali with hand-poured gifts.',holi:'Bright, happy gifts for a colourful day.',eid:'Warm gifts for a gathering. Eid Mubarak.',bday:'Gifts for every birthday, wrapped by hand.'};
function fmtLeft(ms){const s=Math.max(0,Math.floor(ms/1000)),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60,p=n=>String(n).padStart(2,'0');return (d?d+'d ':'')+p(h)+':'+p(m)+(reduce?'':':'+p(x))}
const offer=()=>((cfg.offer&&fest&&cfg.offer(fest.id))||{});
function mountStrap(){if(strapEl)return;strapEl=document.createElement('div');strapEl.id='ft-strap';strapEl.setAttribute('role','region');strapEl.setAttribute('aria-label','Festive offer');strapEl.style.display='none';
 strapEl.addEventListener('click',e=>{if(e.target.closest('.ft-sx')){try{sessionStorage.setItem('ft-sx','1')}catch(x){}page({home:homeOn,strap:strapOn})}});
 footEl=document.createElement('div');footEl.id='ft-foot';footEl.style.display='none'}
function ensureStrap(){const h=document.querySelector('.site-head');if(h&&strapEl.previousElementSibling!==h)h.after(strapEl)}
function ensureFoot(){const f=document.querySelector('.site-foot');if(f&&footEl.nextElementSibling!==f)f.before(footEl)}
function renderStrap(){if(!strapEl||!fest)return;const o=fest,i=offer(),sb=SB[o.id]||{};
 const L=[1.5,6.5,12],Rr=[];const orn=(sb.orn||[]).slice(0,3).map((f,k)=>`<img class="ft-so" alt="" style="left:${L[k]}%;--h:${[8,16,6][k]}px" src="${AS(f)}" onerror="this.remove()"><img class="ft-so ft-so2" alt="" style="left:${Rr[k]}%;--h:${[10,5,14][k]}px" src="${AS(f)}" onerror="this.remove()">`).join('');
 const txt=esc(i.text||STXT[o.id]||o.line);const code=i.code?`<button type="button" class="ft-scode" data-act="copy-code" data-v="${esc(i.code)}" aria-label="Copy the code ${esc(i.code)}">${esc(i.code)}</button>`:'';
 strapEl.innerHTML=(sb.bg?`<div class="ft-sbg" style="background-image:url('${AS(sb.bg)}')"></div>`:'')+orn+`<div class="ft-sin"><strong class="ft-sn">${esc(o.name)}</strong><span class="ft-soff">${txt}</span>${code}<span class="ft-clock" id="ft-clock"></span></div><a class="ft-scta" href="${esc(i.href||'#gifting')}">${esc(i.cta||'Shop gifts')}</a><button type="button" class="ft-sx" aria-label="Hide this banner for now">&times;</button>`;
 footEl.innerHTML=(sb.bg?`<div class="ft-sbg" style="background-image:url('${AS(sb.bg)}')"></div>`:'')+`<div class="ft-fin"><strong>${esc(o.ey)}</strong><span>${txt}</span><a class="ft-scta" href="${esc(i.href||'#gifting')}">${esc(i.cta||'Shop gifts')}</a></div>`;
 tickClock()}
function tickClock(){const c=document.getElementById('ft-clock');if(!c||!fest)return;const i=offer();if(!i.endsAt){c.textContent='';c.hidden=true;return}const ms=i.endsAt-Date.now();c.hidden=false;
 if(ms<=0){c.textContent='Happy '+fest.name;return}c.textContent=(i.label||'Ends in')+' '+fmtLeft(ms)}
function startClock(){clearInterval(clockT);tickClock();clockT=setInterval(()=>{if(!document.hidden)tickClock()},reduce?30000:1000)}
function thanks(o){const d=document.createElement('div');d.className='ft-thx';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','Thank you');
 const line=fest&&SQ[fest.id]?SQ[fest.id]:THX[Math.floor(Math.random()*THX.length)];
 d.innerHTML='<div class="ft-cam" aria-hidden="true"><img alt="" src="'+esc(cfg.photo)+'"><i></i><i></i></div><div><h2>Thank you.</h2><p>'+esc(o.text||'')+'</p>'+(o.points?'<p>You will earn '+o.points+' Bud Points on delivery.</p>':'')+'<div class="q">'+esc(line)+'</div><p style="margin-top:22px"><button class="ft-btn" type="button">Continue</button></p></div>';
 mount();document.body.appendChild(d);cv.classList.add('ft-top');cv.style.display='';
 const W=innerWidth,H=innerHeight,sc=Math.max(W*1.08/IW,H*1.08/IH),ox=(W*1.08-IW*sc)*.5-W*.04,oy=(H*1.08-IH*sc)*.22-H*.04,fx0=ox+FX*IW*sc,fy0=oy+FY*IH*sc;
 $$('i',d.firstChild).forEach(i=>{i.style.left=(fx0+W*.04)+'px';i.style.top=(fy0+H*.04)+'px'});
 let tm=0;const done=()=>{clearTimeout(tm);thxAt=null;cv.classList.remove('ft-top');cv.style.display=routeOK?'':'none';d.remove();removeEventListener('keydown',esck);removeEventListener('hashchange',done)};const esck=e=>{if(e.key==='Escape')done()};addEventListener('keydown',esck);addEventListener('hashchange',done);tm=setTimeout(done,20000);
 const b=$('button',d);b.onclick=done;b.focus();
 if(!reduce){thxAt={x:fx0,y:fy0};confetti(W/2,H*.6,140,1.5);setTimeout(()=>confetti(W*.25,H*.7,60,.9),500);setTimeout(()=>confetti(W*.75,H*.7,60,.9),700);loop()}
 return done}
window.BTFest={config:o=>Object.assign(cfg,o),scenes:SCENES.map(s=>({id:s.id,name:s.name,when:s.when,line:s.line,m:s.m,d:s.d,hint:s.hint||'',ey:s.ey})),start,stop,active:()=>fest&&fest.id,visible:setVisible,page,refresh:()=>{if(fest){renderStrap()}},quote,nextQuote:()=>{qoff++;return quote()},ownerNote:()=>OQ[doy()%OQ.length],thanks,confetti:(x,y,n,sp)=>{mount();cv.style.display='';confetti(x,y,n,sp)},reduce};
})();
