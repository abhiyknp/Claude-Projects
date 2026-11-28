-- 1. Box size for Shiprocket: 17 x 14 x 10 cm = 2,380 cubic cm; divided by 5,000 that is 0.48 kg, so it is billed on the real
--    weight (0.5 kg) and not pushed into the 1 kg band (the old 20 x 15 x 10 box counted as 0.6 kg).
-- 2. Full business address (invoices only; the website shows the area only).
-- Safe to run twice. Run in Supabase -> SQL Editor.
begin;
insert into settings (key, value) values ('parcelKg', '0.5'::jsonb), ('parcelL', '17'::jsonb), ('parcelB', '14'::jsonb), ('parcelH', '10'::jsonb)
  on conflict (key) do update set value = excluded.value, updated_at = now();
insert into settings (key, value) values ('bizAddress', to_jsonb('Z-1001, Amrapali Verona Heights, Tech Zone 4, Bisrakh, Greater Noida, Uttar Pradesh 201318. Landmark: Metro University'::text))
  on conflict (key) do update set value = excluded.value, updated_at = now();
commit;
select key, value from settings where key in ('parcelKg','parcelL','parcelB','parcelH','bizAddress') order by key;
