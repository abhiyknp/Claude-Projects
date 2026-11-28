-- Paint Your Starfish multi-buy: 1 kit 149, Set of 2 249, Set of 3 349. 28 Nov 2026. Run once in Supabase -> SQL editor.
-- The kit moves out of Gift boxes to the Jesmonite pieces at 149 and is live (and its leftover "N/A" scent is cleared). The two sets are added LIVE and in stock (99).
-- They use a temporary photo of the kit until you add real photos in Owner view -> Photos & videos.
-- Safe to run again: the sets are added only if missing; the kit's price and place are set each time.
-- It does not touch any other product, stock, photos, orders or settings.
begin;
update products set data = jsonb_set(jsonb_set(data, '{cat}', '"jesmonite"'::jsonb), '{variants,0,price}', '149'::jsonb) || jsonb_build_object('notes', '[]'::jsonb), live = true
  where id = 'bnt-prd-diy-001';
insert into products (id, data, sort, live) values ('bnt-prd-st-004', $j${"id": "bnt-prd-st-004", "name": "Paint Your Starfish · Set of 2", "cat": "jesmonite", "type": "DIY paint kit set", "line": "Two paint-your-own starfish kits, each with paints and a brush, 86 g in all.", "desc": "Two paint-your-own starfish kits, each with paints and a brush, 86 g in all.", "notes": [], "variants": [{"sku": "BNT-PRD-ST-004", "label": "Set of 2", "price": 249, "stock": 99}], "material": "Paint-your-own starfish kits.", "size": "86 g in all", "weight": 86, "care": [], "mood": ["creative"], "space": ["workspace"], "occ": ["birthday", "just-because"], "gift": true, "art": "tray", "c": "#81624C", "colour": "White"}$j$::jsonb, 480, true) on conflict (id) do nothing;
insert into stock (sku, qty) values ('BNT-PRD-ST-004', 99) on conflict (sku) do nothing;
insert into products (id, data, sort, live) values ('bnt-prd-st-005', $j${"id": "bnt-prd-st-005", "name": "Paint Your Starfish · Set of 3", "cat": "jesmonite", "type": "DIY paint kit set", "line": "Three paint-your-own starfish kits, each with paints and a brush, 129 g in all.", "desc": "Three paint-your-own starfish kits, each with paints and a brush, 129 g in all.", "notes": [], "variants": [{"sku": "BNT-PRD-ST-005", "label": "Set of 3", "price": 349, "stock": 99}], "material": "Paint-your-own starfish kits.", "size": "129 g in all", "weight": 129, "care": [], "mood": ["creative"], "space": ["workspace"], "occ": ["birthday", "just-because"], "gift": true, "art": "tray", "c": "#81624C", "colour": "White"}$j$::jsonb, 490, true) on conflict (id) do nothing;
insert into stock (sku, qty) values ('BNT-PRD-ST-005', 99) on conflict (sku) do nothing;
-- if you ran this before: bring the sets to the locked prices and raise a count of 0 or 1 to 99
update products set data = jsonb_set(data, '{variants,0,price}', '249'::jsonb) where id = 'bnt-prd-st-004';
update products set data = jsonb_set(data, '{variants,0,price}', '349'::jsonb) where id = 'bnt-prd-st-005';
update stock set qty = 99, updated_at = now() where sku in ('BNT-PRD-ST-004', 'BNT-PRD-ST-005') and qty <= 1;
commit;

select id, data->>'name' as name, data->>'cat' as cat, data->'variants'->0->>'price' as price, live,
  (select qty from stock where sku = upper(products.id)) as stock
from products where id in ('bnt-prd-diy-001', 'bnt-prd-st-004', 'bnt-prd-st-005') order by id;
