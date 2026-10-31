#!/usr/bin/env python3
"""Builds the catalogue share kit into catalogue/share/:
   qr.svg, qr.png, story-1080x1920.png, og.png (1200x630), whatsapp-square-1080.png
   python3 -I tools/build-share.py        (needs: pip install qrcode, and node + playwright for the PNGs)
Colours: Silk · Maroon & Gold only. Logo: the red-upper-left-leaf emblem."""
import os, subprocess, qrcode, base64, json
from qrcode.constants import ERROR_CORRECT_H
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'catalogue', 'share')
URL = 'https://budandthings.com/catalogue/'
QR_URL = URL + '?utm_source=qr&utm_medium=share'
MAROON, MAROON_D, GOLD, CREAM, INK = '#8F1834', '#7A1229', '#D6A34A', '#F8F0E4', '#150206'
os.makedirs(OUT, exist_ok=True)

def qr_svg(url, size=1000, logo=True):
    q = qrcode.QRCode(error_correction=ERROR_CORRECT_H, border=0); q.add_data(url); q.make(fit=True)
    m = q.get_matrix(); n = len(m); quiet = 3; tot = n + 2 * quiet; u = size / tot
    def eye(r, c):  # finder pattern zones
        return (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)
    mid = n / 2; hole = n * 0.11  # keep centre clear for the emblem
    parts = []
    for r in range(n):
        for c in range(n):
            if not m[r][c] or eye(r, c): continue
            if logo and abs(r + .5 - mid) < hole + 1 and abs(c + .5 - mid) < hole + 1: continue
            x, y = (c + quiet) * u, (r + quiet) * u
            parts.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{u*1.02:.2f}" height="{u*1.02:.2f}" rx="{u*.2:.2f}"/>')
    eyes = []
    for (r, c) in [(0, 0), (0, n - 7), (n - 7, 0)]:
        x, y = (c + quiet) * u, (r + quiet) * u
        eyes.append(f'<rect x="{x+u*.5:.2f}" y="{y+u*.5:.2f}" width="{u*6:.2f}" height="{u*6:.2f}" rx="{u*1.2:.2f}" fill="none" stroke="{MAROON_D}" stroke-width="{u:.2f}"/>'
                    f'<rect x="{x+u*2:.2f}" y="{y+u*2:.2f}" width="{u*3:.2f}" height="{u*3:.2f}" rx="{u*.6:.2f}" fill="{MAROON_D}"/>')
    emb = ''
    if logo:
        d = hole * 2 * u * 1.15
        emb = (f'<circle cx="{size/2}" cy="{size/2}" r="{d*.62:.1f}" fill="{CREAM}"/>'
               f'<image href="{EMB}" x="{size/2-d*.58:.1f}" y="{size/2-d*.58:.1f}" width="{d*1.16:.1f}" height="{d*1.16:.1f}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}" role="img" aria-label="QR code for the catalogue">'
            f'<rect width="{size}" height="{size}" fill="{CREAM}"/><g fill="{MAROON}">{"".join(parts)}</g>{"".join(eyes)}{emb}</svg>')

from PIL import Image
emb = Image.open(os.path.join(ROOT, 'prototype/assets/silk/emblem.webp')).convert('RGBA'); emb.thumbnail((240, 240))
emb.save('/tmp/_emb.png'); EMB = 'data:image/png;base64,' + base64.b64encode(open('/tmp/_emb.png', 'rb').read()).decode()
open(f'{OUT}/qr.svg', 'w').write(qr_svg(QR_URL))

def b64(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()
FONTS = f"""@font-face{{font-family:'Playfair Display';src:url({b64(ROOT+'/prototype/assets/fonts/playfair.woff2','font/woff2')}) format('woff2');font-weight:400 900}}
@font-face{{font-family:'Playfair Display';font-style:italic;src:url({b64(ROOT+'/prototype/assets/fonts/playfair-italic.woff2','font/woff2')}) format('woff2');font-weight:400 900}}
@font-face{{font-family:'Montserrat';src:url({b64(ROOT+'/prototype/assets/fonts/montserrat.woff2','font/woff2')}) format('woff2');font-weight:100 900}}"""
img = lambda n: b64(f'{ROOT}/catalogue/img/{n}.jpg', 'image/jpeg')
EMBLEM = b64(ROOT + '/prototype/assets/silk/emblem.webp', 'image/webp')
LOGO_H = b64(ROOT + '/prototype/assets/silk/logo-horizontal.webp', 'image/webp')
QR = 'data:image/svg+xml;base64,' + base64.b64encode(qr_svg(QR_URL, logo=True).encode()).decode()
TILES = [('bnt-prd-cg-001', 'Glass Candles'), ('bnt-prd-tl-001', 'Tealight Candles'), ('bnt-prd-mc-001', 'Moulded Candles'), ('bnt-prd-jt-001', 'Jesmonite Trays')]
tiles = ''.join(f'<figure><img src="{img(i)}"><figcaption>{t}</figcaption></figure>' for i, t in TILES)
BASE = f"""{FONTS}
*{{box-sizing:border-box;margin:0}}
body{{font-family:Montserrat,sans-serif;color:{CREAM}}}
.pl{{font-family:'Playfair Display',serif}}"""

story = f"""<style>{BASE}
body{{width:1080px;height:1920px;background:radial-gradient(circle at 50% 0%,{MAROON} 0%,{MAROON_D} 70%);padding:90px 70px;text-align:center;position:relative;overflow:hidden;border:0}}
.frame{{position:absolute;inset:34px;border:3px solid {GOLD};border-radius:36px;pointer-events:none}}
.emb{{width:230px;height:230px;border-radius:50%;background:{CREAM};padding:8px}}
h1{{font:600 96px/1.05 'Playfair Display',serif;margin:36px 0 12px;color:{CREAM}}}
h1 i{{color:{GOLD};font-weight:500}}
.sub{{font-size:30px;letter-spacing:.22em;text-transform:uppercase;color:{GOLD}}}
.tiles{{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;margin:40px 0 40px}}
figure{{background:{CREAM};border-radius:22px;padding:12px 12px 16px;border:2px solid {GOLD}}}
figure img{{width:100%;aspect-ratio:1.55;object-fit:cover;border-radius:14px;display:block}}
figcaption{{font:600 28px 'Playfair Display',serif;color:{MAROON};margin-top:12px}}
.qrbox{{display:inline-flex;align-items:center;gap:34px;background:{CREAM};border-radius:30px;padding:26px 36px 26px 26px;border:3px solid {GOLD};text-align:left}}
.qrbox img{{width:330px;height:330px;border-radius:12px}}
.qrbox b{{display:block;font:600 44px/1.1 'Playfair Display',serif;color:{MAROON}}}
.qrbox span{{display:block;color:{INK};font-size:24px;margin-top:10px}}
.url{{margin-top:36px;font-size:34px;letter-spacing:.06em;color:{GOLD};font-weight:600}}
.tag{{margin-top:14px;font:italic 400 30px 'Playfair Display',serif;color:{CREAM}}}
</style><body><div class="frame"></div>
<img class="emb" src="{EMBLEM}">
<h1>Our <i>catalogue</i></h1><div class="sub">Handmade · Candles · Jesmonite</div>
<div class="tiles">{tiles}</div>
<div class="qrbox"><img src="{QR}"><div><b>Scan to browse</b><span>Prices in rupees.<br>Ordering opens soon.</span></div></div>
<div class="url">budandthings.com/catalogue</div><div class="tag">Little things, big feelings</div></body>"""

og = f"""<style>{BASE}
body{{width:1200px;height:630px;background:linear-gradient(120deg,{MAROON_D},{MAROON});display:flex;align-items:center;gap:48px;padding:0 70px;position:relative}}
.frame{{position:absolute;inset:18px;border:2px solid {GOLD};border-radius:20px}}
.emb{{width:300px;height:300px;border-radius:50%;background:{CREAM};padding:6px;flex:none}}
h1{{font:600 78px/1.05 'Playfair Display',serif}} h1 i{{color:{GOLD};font-weight:500}}
p{{font-size:28px;margin-top:16px;color:{GOLD};letter-spacing:.16em;text-transform:uppercase}}
.u{{margin-top:26px;font-size:30px;font-weight:600}}
.pics{{display:flex;gap:10px;margin-top:26px}} .pics img{{width:96px;height:96px;object-fit:cover;border-radius:12px;border:2px solid {GOLD}}}
</style><body><div class="frame"></div><img class="emb" src="{EMBLEM}"><div><h1>Our <i>catalogue</i></h1><p>Handmade candles &amp; Jesmonite</p>
<div class="pics">{''.join(f'<img src="{img(i)}">' for i,_ in TILES)}</div><div class="u">budandthings.com/catalogue</div></div></body>"""

square = f"""<style>{BASE}
body{{width:1080px;height:1080px;background:{CREAM};color:{INK};padding:60px;text-align:center;position:relative}}
.frame{{position:absolute;inset:24px;border:3px solid {GOLD};border-radius:28px}}
img.lg{{height:110px;margin-top:10px}}
h1{{font:600 70px 'Playfair Display',serif;color:{MAROON};margin:30px 0 24px}}
.tiles{{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}}
figure{{background:#fff;border-radius:16px;padding:8px 8px 12px;border:2px solid {GOLD}}}
figure img{{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;display:block}}
figcaption{{font:600 21px 'Playfair Display',serif;color:{MAROON};margin-top:8px}}
.row{{display:flex;align-items:center;justify-content:center;gap:36px;margin-top:40px}}
.row img{{width:300px;border-radius:12px}} .row b{{font:600 50px/1.1 'Playfair Display',serif;color:{MAROON};display:block;text-align:left}}
.row span{{display:block;text-align:left;font-size:26px;margin-top:10px;color:{MAROON_D}}}
</style><body><div class="frame"></div><img class="lg" src="{LOGO_H}"><h1>Our catalogue</h1><div class="tiles">{tiles}</div>
<div class="row"><img src="{QR}"><div><b>Scan to browse</b><span>budandthings.com/catalogue</span></div></div></body>"""

for name, html, w, h in [('story-1080x1920', story, 1080, 1920), ('og', og, 1200, 630), ('square-1080', square, 1080, 1080)]:
    hp = f'/tmp/_share_{name}.html'; open(hp, 'w').write(f'<!doctype html><meta charset=utf-8>{html}')
    open('/tmp/_r.js', 'w').write(f"""const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage({{viewport:{{width:{w},height:{h}}}}});
await p.goto('file://{hp}');await p.evaluate(()=>document.fonts.ready);await p.screenshot({{path:'{OUT}/{name}.png'}});await b.close()}})()""")
    subprocess.run(['node', '/tmp/_r.js'], check=True, env={**os.environ, 'NODE_PATH': subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()})
# plain QR png for print
open('/tmp/_q.html', 'w').write(f'<body style="margin:0"><img src="{QR}" style="width:1000px">')
open('/tmp/_r.js', 'w').write(f"""const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage({{viewport:{{width:1000,height:1000}}}});
await p.goto('file:///tmp/_q.html');await p.screenshot({{path:'{OUT}/qr.png'}});await b.close()}})()""")
subprocess.run(['node', '/tmp/_r.js'], check=True, env={**os.environ, 'NODE_PATH': subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()})
print('done', os.listdir(OUT))
