#!/usr/bin/env python3
"""Builds catalogue/diwali/index.html (the swipeable Diwali story, products inlined) from catalogue/products.json.
   python3 -I tools/build-story.py
Set WA_NUMBER below (digits with country code, e.g. 919XXXXXXXXX) to send picks straight to the shop WhatsApp."""
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
WA_NUMBER = '917985508939'                      # shop WhatsApp, digits only with country code. Empty: picks go via Instagram DM
IG = 'budandthings_official'
CH = [('Glass Candles', 'Glass candles', 'Little jars of light'), ('Tealight Candles', 'Tealights', 'Tiny flames for every thali'),
      ('Moulded Candles', 'Moulded candles', 'Shapes that make you smile'), ('Jesmonite Tray', 'Jesmonite trays', 'For sweets, keys and keepsakes')]
P = json.load(open(f'{ROOT}/catalogue/products.json'))['products']
out = []
for tab, title, tag in CH:
    seen, items = set(), []
    for p in P:
        if p['sheetTab'] != tab or p['name'] in seen: continue
        seen.add(p['name']); items.append({'id': p['id'].lower(), 'n': p['name'], 'p': p['price'], 'i': p['img']})
    out.append({'t': title, 'g': tag, 'items': items})
data = json.dumps({'wa': WA_NUMBER, 'ig': IG, 'ch': out}, ensure_ascii=False).replace('</', '<\\/')
tpl = open(f'{ROOT}/tools/story-template.html').read()
open(f'{ROOT}/catalogue/diwali/index.html', 'w').write(tpl.replace('/*DATA*/', data))
print(sum(len(c['items']) for c in out), 'pieces')
