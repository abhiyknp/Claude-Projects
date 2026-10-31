#!/usr/bin/env python3
"""Writes the shop's built-in product list into prototype/index.html from data/catalogue.sheet.json
(a snapshot of the team sheet). A product is included only if Show on website = YES and it has a price.
   python3 -I tools/build-shop-data.py
Real photos: prototype/assets/catalogue/<id>.jpg (a real photo replaces the sheet's temporary one when it clearly matches)."""
import json, os, re
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
rows = json.load(open(H + '/data/catalogue.sheet.json'))
fix = {'Vanila': 'Vanilla', 'Whit Oud': 'White Oud', 'Marrigold Glow': 'Marigold Glow'}  # spelling fixes in public text only
def tidy(s): s = (s or '').strip(); return fix.get(s, s)
def cols(c): return re.sub(r'\s*\+\s*', ' and ', c.strip()).lower().replace('multi color', 'multicolour')
names = {}
for r in rows:
    if r['show'] == 'YES' and r['price']: names.setdefault(r['name'], []).append(r)
out = []
for r in rows:
    if r['show'] != 'YES' or not r['price']: continue
    n = tidy(r['name']); sku = r['id']; g = r['grams']
    if len(names[r['name']]) > 1: n += ' · ' + r['colour'].strip().replace('+', ' + ').replace('  ', ' ').title().replace('Baby Pink', 'Baby pink')
    kind = r['type'].lower()
    jes = kind.startswith('jesmonite')
    scent = tidy(r['scent'])
    if scent.lower() in ('n/a', ''): notes = None
    elif scent.lower().startswith('any'): notes = ['Assorted scent']
    else: notes = [scent]
    c = cols(r['colour'])
    if jes:
        what = 'tray' if 'tray' in kind else 'dish'
        desc = f'A hand-cast Jesmonite {what} in {c}. About {g} g. Each piece varies a little in colour and pattern.'
        line = f'Hand-cast {what}, {c}.'
        mat = 'Cast by hand in Jesmonite, a water-based composite. Each piece varies slightly in colour and pattern.'
        care = ['Wipe with a soft, damp cloth.', 'Not dishwasher-safe and not for food.', 'Keep away from long contact with water.']
        cat, typ, art = 'jesmonite', 'Tray' if what == 'tray' else 'Dish', what if what == 'dish' else 'tray'
    else:
        word = {'glass candle': 'hand-poured glass candle', 'moulded candle': 'hand-moulded candle', 'tealight candle': 'hand-poured tealight'}.get(kind, 'hand-poured candle')
        sc = f'{notes[0]} scent' if notes and not notes[0].startswith('Assorted') else ('Assorted scent' if notes else '')
        desc = f'A {word}{", " + sc.lower() if sc else ""}, in {c}. About {g} g.'
        line = f'{sc + " · " if sc else ""}{c.capitalize()}'
        mat = {'glass candle': 'Hand-poured candle in a glass.', 'moulded candle': 'Hand-moulded candle.', 'tealight candle': 'Hand-poured tealight.'}.get(kind, 'Hand-poured candle.')
        care = ['Let the first burn melt to the edges.', 'Trim the wick to 5 mm before each light.', 'Never leave a burning candle unattended.']
        cat, typ, art = 'candles', {'glass candle': 'Glass candle', 'moulded candle': 'Moulded candle', 'tealight candle': 'Tealight'}.get(kind, 'Candle'), 'jar'
    pid = sku.lower()
    o = {'id': pid, 'name': n, 'cat': cat, 'type': typ, 'line': line, 'desc': desc}
    if notes: o['notes'] = notes
    o.update({'variants': [{'sku': sku, 'label': f'{g} g', 'price': r['price'], 'stock': r['stock']}], 'material': mat, 'size': f'{g} g', 'weight': g,
              'care': care, 'mood': [], 'space': [], 'occ': [], 'gift': True, 'art': art, 'c': '#F4ECE0', 'img': f'assets/catalogue/{pid}.jpg'})
    out.append(o)
js = 'let P = [\n' + ',\n'.join('  ' + json.dumps(o, ensure_ascii=False) for o in out) + '\n];\n'
f = H + '/prototype/index.html'; s = open(f).read()
a = s.index('let P = [\n'); b = s.index('let PAIRINGS = [')
s = s[:a] + js + s[b:]
open(f, 'w').write(s); print(len(out), 'products')
