-- Two site settings, 28 Nov 2026. Run once in Supabase -> SQL editor. Safe to run again.
--  * Jar re-pour price: 199 (it was 599, more than a new candle). It shows on glass and Murphy candle pages only.
--  * Public business address: area only (no building or sector). It shows on policy pages, pack details and invoices.
-- It does not touch products, stock, orders, photos or any other setting.
begin;
insert into settings (key, value) values ('repourPrice', '199'::jsonb)
  on conflict (key) do update set value = excluded.value, updated_at = now();
insert into settings (key, value) values ('bizAddress', to_jsonb('Greater Noida West, Gautam Buddha Nagar, Uttar Pradesh 201318'::text))
  on conflict (key) do update set value = excluded.value, updated_at = now();
commit;

select key, value from settings where key in ('repourPrice', 'bizAddress');
