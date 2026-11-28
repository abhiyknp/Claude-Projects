-- Locked names and prices from the master sheet (26 Nov 2026, prices of the small moulded candles updated 27 Nov). Run once in Supabase -> SQL editor.
-- It changes only the name and price of the 31 products (and the pack wording of the six tealights), and hides Paint Your Starfish.
-- It does NOT touch stock, photos, orders, customers, coupons, gift cards, reviews, settings or site text.
-- Safe to run again: it sets the same values each time.
begin;
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Iced Latte$j$::text)), '{variants,0,price}', '329'::jsonb) where id = 'bnt-prd-cg-001';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Vanilla Gold$j$::text)), '{variants,0,price}', '329'::jsonb) where id = 'bnt-prd-cg-002';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$BlueBerry Swirl$j$::text)), '{variants,0,price}', '329'::jsonb) where id = 'bnt-prd-cg-003';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Strawberry Cream$j$::text)), '{variants,0,price}', '329'::jsonb) where id = 'bnt-prd-cg-004';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Cocoa Bites$j$::text)), '{variants,0,price}', '329'::jsonb) where id = 'bnt-prd-cg-005';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Angel & Amber$j$::text)), '{variants,0,price}', '329'::jsonb) where id = 'bnt-prd-cg-006';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Berry Blast$j$::text)), '{variants,0,price}', '549'::jsonb) where id = 'bnt-prd-cg-007';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Daisy Pop$j$::text)), '{variants,0,price}', '479'::jsonb) where id = 'bnt-prd-cg-008';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Petal & Pour$j$::text)), '{variants,0,price}', '449'::jsonb) where id = 'bnt-prd-cg-009';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Sunlit Gel$j$::text)), '{variants,0,price}', '479'::jsonb) where id = 'bnt-prd-cg-010';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Dessert Jar$j$::text)), '{variants,0,price}', '249'::jsonb) where id = 'bnt-prd-cg-011';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Mini Bubble Candle · Yellow$j$::text)), '{variants,0,price}', '129'::jsonb) where id = 'bnt-prd-mc-001';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Sunflower Float · Yellow + Brown$j$::text)), '{variants,0,price}', '99'::jsonb) where id = 'bnt-prd-mc-002';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Ladoo-shaped candle$j$::text)), '{variants,0,price}', '99'::jsonb) where id = 'bnt-prd-mc-003';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Blooming Rose · Purple + White$j$::text)), '{variants,0,price}', '99'::jsonb) where id = 'bnt-prd-mc-004';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Mini Bubble Candle · Baby pink$j$::text)), '{variants,0,price}', '129'::jsonb) where id = 'bnt-prd-mc-005';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Mini Bubble Candle · Pink$j$::text)), '{variants,0,price}', '129'::jsonb) where id = 'bnt-prd-mc-006';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Sunflower Float · Orange$j$::text)), '{variants,0,price}', '99'::jsonb) where id = 'bnt-prd-mc-007';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Purple Haze$j$::text)), '{variants,0,price}', '99'::jsonb) where id = 'bnt-prd-mc-008';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Blooming Rose · Red + White$j$::text)), '{variants,0,price}', '99'::jsonb) where id = 'bnt-prd-mc-009';
update products set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Sunflower Glow · Pack of 6$j$::text)), '{variants,0,price}', '149'::jsonb), '{variants,0,label}', to_jsonb($j$Pack of 6$j$::text)), '{size}', to_jsonb($j$Pack of 6 · 72 g$j$::text)), '{weight}', '72'::jsonb), '{desc}', to_jsonb($j$A pack of 6 hand-poured tealights, assorted scent, in yellow. About 72 g in all.$j$::text)) where id = 'bnt-prd-tl-001';
update products set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Midnight Sunflower · Pack of 6$j$::text)), '{variants,0,price}', '149'::jsonb), '{variants,0,label}', to_jsonb($j$Pack of 6$j$::text)), '{size}', to_jsonb($j$Pack of 6 · 72 g$j$::text)), '{weight}', '72'::jsonb), '{desc}', to_jsonb($j$A pack of 6 hand-poured tealights, assorted scent, in blue and yellow. About 72 g in all.$j$::text)) where id = 'bnt-prd-tl-002';
update products set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Marigold Glow · Pack of 6$j$::text)), '{variants,0,price}', '149'::jsonb), '{variants,0,label}', to_jsonb($j$Pack of 6$j$::text)), '{size}', to_jsonb($j$Pack of 6 · 72 g$j$::text)), '{weight}', '72'::jsonb), '{desc}', to_jsonb($j$A pack of 6 hand-poured tealights, assorted scent, in orange and white. About 72 g in all.$j$::text)) where id = 'bnt-prd-tl-003';
update products set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Love Note · Pack of 6$j$::text)), '{variants,0,price}', '149'::jsonb), '{variants,0,label}', to_jsonb($j$Pack of 6$j$::text)), '{size}', to_jsonb($j$Pack of 6 · 72 g$j$::text)), '{weight}', '72'::jsonb), '{desc}', to_jsonb($j$A pack of 6 hand-poured tealights, assorted scent, in red and white. About 72 g in all.$j$::text)) where id = 'bnt-prd-tl-004';
update products set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Violet Whisper · Pack of 6$j$::text)), '{variants,0,price}', '149'::jsonb), '{variants,0,label}', to_jsonb($j$Pack of 6$j$::text)), '{size}', to_jsonb($j$Pack of 6 · 72 g$j$::text)), '{weight}', '72'::jsonb), '{desc}', to_jsonb($j$A pack of 6 hand-poured tealights, assorted scent, in purple and white. About 72 g in all.$j$::text)) where id = 'bnt-prd-tl-005';
update products set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Rosé Whirl · Pack of 6$j$::text)), '{variants,0,price}', '149'::jsonb), '{variants,0,label}', to_jsonb($j$Pack of 6$j$::text)), '{size}', to_jsonb($j$Pack of 6 · 72 g$j$::text)), '{weight}', '72'::jsonb), '{desc}', to_jsonb($j$A pack of 6 hand-poured tealights, assorted scent, in pink and white. About 72 g in all.$j$::text)) where id = 'bnt-prd-tl-006';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Rose Dawn$j$::text)), '{variants,0,price}', '229'::jsonb) where id = 'bnt-prd-jt-001';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Ivory Gilt$j$::text)), '{variants,0,price}', '229'::jsonb) where id = 'bnt-prd-jt-002';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Cloud Marble$j$::text)), '{variants,0,price}', '199'::jsonb) where id = 'bnt-prd-jt-003';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Little Hearts$j$::text)), '{variants,0,price}', '199'::jsonb) where id = 'bnt-prd-jt-004';
update products set data = jsonb_set(jsonb_set(data, '{name}', to_jsonb($j$Holi Bloom$j$::text)), '{variants,0,price}', '199'::jsonb) where id = 'bnt-prd-jt-005';
update products set live = true where id = 'bnt-prd-diy-001'; -- Paint Your Starfish is on sale (owner decision, 28 Nov)
commit;

-- Check: should list the live products with the new prices, and Paint Your Starfish as live.
select id, data->>'name' as name, data->'variants'->0->>'price' as price, live from products order by sort;
