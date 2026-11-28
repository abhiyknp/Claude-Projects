-- Puts every product option IN STOCK with a count of 99, so no order is lost to "Sold out". 28 Nov 2026. Run once in Supabase -> SQL editor.
-- Every order takes one off the count. When something is really out, set its count to 0 in Owner view -> Stock (or set the real count).
-- A count already above 99 is left alone. Options with no stock row get one (a missing row shows "Sold out").
-- It does not touch products, prices, photos, orders or settings. Safe to run again, but running it again resets your own lower counts to 99.
begin;
insert into stock (sku, qty)
  select distinct v ->> 'sku', 99 from products p, jsonb_array_elements(p.data -> 'variants') v where coalesce(v ->> 'sku', '') <> ''
  on conflict (sku) do nothing;
update stock set qty = 99, updated_at = now() where qty < 99;
commit;

select count(*) as options, count(*) filter (where qty >= 99) as at_99_or_more, count(*) filter (where qty = 0) as sold_out from stock;
select p.id, v ->> 'sku' as sku, s.qty from products p, jsonb_array_elements(p.data -> 'variants') v left join stock s on s.sku = v ->> 'sku' where s.sku is null or s.qty < 99;
