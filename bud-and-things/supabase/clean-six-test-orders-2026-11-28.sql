-- Removes six TEST orders and gives their pieces back to stock. 28 Nov 2026.
--   BT-1039-6B8A97, BT-1040-E4719E, BT-1041-37148E, BT-1042-A290C8, BT-1043-521E25, BT-1044-692C60
-- BEFORE you run it: refund each real payment in Razorpay and cancel any open shipment in Shiprocket. Keep the refund numbers.
-- What it does:
--   * stops, changing nothing, if one of them is an offline (real) order
--   * adds back to stock what each order was holding (an order already Cancelled gave its stock back before, so it adds nothing).
--     It ADDS the pieces back, it does not reset stock to 99, so the real counts you set stay right
--   * gives back any gift card balance a still-open order used
--   * VOIDS (does not delete) their invoices, so invoice numbers have no gaps and the books stay in order
--   * deletes the orders, their queued or sent messages and their short bill links
--   * coupon use and Bud Points are counted from orders, so deleting the orders gives HELLO10 and the points back
-- Run in Supabase -> SQL Editor. Safe to run twice (the second run finds nothing to do).

-- ============ PART 1: preview (changes nothing). Run this alone first. ============
select id, status, total, data -> 'contact' ->> 'name' as customer, data ->> 'channel' as channel
  from orders where id in ('BT-1039-6B8A97', 'BT-1040-E4719E', 'BT-1041-37148E', 'BT-1042-A290C8', 'BT-1043-521E25', 'BT-1044-692C60') order by created_at;

-- ============ PART 2: clean up. Run after checking part 1 lists exactly those six. ============
begin;
do $$ begin
  if exists (select 1 from orders where id in ('BT-1039-6B8A97', 'BT-1040-E4719E', 'BT-1041-37148E', 'BT-1042-A290C8', 'BT-1043-521E25', 'BT-1044-692C60') and (data ->> 'channel') = 'offline') then
    raise exception 'One of the six is an offline order. Nothing was changed.';
  end if;
end $$;

with held as (
  select it ->> 'sku' as sku, sum((it ->> 'qty')::int) as q
  from orders o, jsonb_array_elements(o.data -> 'items') it
  where o.id in ('BT-1039-6B8A97', 'BT-1040-E4719E', 'BT-1041-37148E', 'BT-1042-A290C8', 'BT-1043-521E25', 'BT-1044-692C60') and o.status <> 'Cancelled'
  group by 1)
update stock s set qty = s.qty + h.q, updated_at = now() from held h where s.sku = h.sku;

update gift_cards g set balance = g.balance + x.b
  from (select o.data ->> 'card' as code, sum(coalesce((o.data ->> 'cardOff')::int, 0)) as b from orders o
        where o.id in ('BT-1039-6B8A97', 'BT-1040-E4719E', 'BT-1041-37148E', 'BT-1042-A290C8', 'BT-1043-521E25', 'BT-1044-692C60') and o.status <> 'Cancelled' and (o.data ->> 'card') is not null group by 1) x
  where g.code = x.code and x.b > 0;

delete from notifications where order_id in ('BT-1039-6B8A97', 'BT-1040-E4719E', 'BT-1041-37148E', 'BT-1042-A290C8', 'BT-1043-521E25', 'BT-1044-692C60');
delete from bills where order_id in ('BT-1039-6B8A97', 'BT-1040-E4719E', 'BT-1041-37148E', 'BT-1042-A290C8', 'BT-1043-521E25', 'BT-1044-692C60');
update invoices set status = 'Void', void_reason = 'Test order', voided_at = now()
  where order_id in ('BT-1039-6B8A97', 'BT-1040-E4719E', 'BT-1041-37148E', 'BT-1042-A290C8', 'BT-1043-521E25', 'BT-1044-692C60') and status = 'Issued';
delete from orders where id in ('BT-1039-6B8A97', 'BT-1040-E4719E', 'BT-1041-37148E', 'BT-1042-A290C8', 'BT-1043-521E25', 'BT-1044-692C60');
commit;

-- check: none of the six is left; the rest are as before
select id, status, total, data -> 'contact' ->> 'name' as customer from orders order by created_at;
select count(*) as voided_test_invoices from invoices where void_reason = 'Test order';
