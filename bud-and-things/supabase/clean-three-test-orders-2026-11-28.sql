-- Removes three TEST orders (BT-1036-5D183D, BT-1037-3019E3, BT-1038-F576B2) and puts the stock for their items back to 99.
-- Nothing else is touched: the 5 offline orders, BT-1039-6B8A97, products, settings and customers stay as they are.
-- What it does:
--   * stops, changing nothing, if one of the three is an offline (real) order
--   * sets the stock of the items on these orders back to 99 (the level you set before testing)
--   * VOIDS (does not delete) their invoices, so invoice numbers have no gaps and the books stay in order
--   * deletes the orders, their queued or sent messages and their short bill links
--   * coupon use and Bud Points are counted from orders, so deleting the orders gives HELLO10 and the points back
-- Run in Supabase -> SQL Editor. Safe to run twice (the second run finds nothing to do).

-- ============ PART 1: preview (changes nothing). Run this alone first. ============
select id, status, total, data -> 'contact' ->> 'name' as customer, data ->> 'channel' as channel
  from orders where id in ('BT-1036-5D183D', 'BT-1037-3019E3', 'BT-1038-F576B2') order by created_at;

-- ============ PART 2: clean up. Run after checking part 1 lists exactly those three. ============
begin;
do $$ begin
  if exists (select 1 from orders where id in ('BT-1036-5D183D', 'BT-1037-3019E3', 'BT-1038-F576B2') and (data ->> 'channel') = 'offline') then
    raise exception 'One of the three is an offline order. Nothing was changed.';
  end if;
end $$;

update stock set qty = 99, updated_at = now()
  where sku in (select distinct it ->> 'sku' from orders o, jsonb_array_elements(o.data -> 'items') it
                where o.id in ('BT-1036-5D183D', 'BT-1037-3019E3', 'BT-1038-F576B2'));
delete from notifications where order_id in ('BT-1036-5D183D', 'BT-1037-3019E3', 'BT-1038-F576B2');
delete from bills where order_id in ('BT-1036-5D183D', 'BT-1037-3019E3', 'BT-1038-F576B2');
update invoices set status = 'Void', void_reason = 'Test order', voided_at = now()
  where order_id in ('BT-1036-5D183D', 'BT-1037-3019E3', 'BT-1038-F576B2') and status = 'Issued';
delete from orders where id in ('BT-1036-5D183D', 'BT-1037-3019E3', 'BT-1038-F576B2');
commit;

-- check: none of the three is left; the rest are as before
select id, status, total, data -> 'contact' ->> 'name' as customer from orders order by created_at;
select count(*) as voided_test_invoices from invoices where void_reason = 'Test order';
