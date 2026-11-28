-- Site settings, 28 Nov 2026. Run in Supabase -> SQL editor. Safe to run again. It touches only the three settings named here.
--
-- PART A: run now.   Jar re-pour price 199 (it was 599, more than a new candle). Shows on glass and Murphy candle pages only.
-- PART B: run AFTER the website update with the two address settings is live (after the merge and the site build).
--         bizAddress   = the FULL address, printed on invoices and bills only
--         siteAddress  = the area only, shown on the website (policy pages, pack details)
--         If you run part B before the update is live, the website shows the full address until it is.

-- ============ PART A ============
begin;
insert into settings (key, value) values ('repourPrice', '199'::jsonb)
  on conflict (key) do update set value = excluded.value, updated_at = now();
commit;

-- ============ PART B ============
begin;
insert into settings (key, value) values ('bizAddress', to_jsonb('Amarpali Verona Heights, Tech Zone 4, Gautam Buddha Nagar, Greater Noida West, Uttar Pradesh 201318'::text))
  on conflict (key) do update set value = excluded.value, updated_at = now();
insert into settings (key, value) values ('siteAddress', to_jsonb('Greater Noida West, Gautam Buddha Nagar, Uttar Pradesh 201318'::text))
  on conflict (key) do update set value = excluded.value, updated_at = now();
commit;

select key, value from settings where key in ('repourPrice', 'bizAddress', 'siteAddress') order by key;
