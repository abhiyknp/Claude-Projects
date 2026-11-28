-- Removes the TEST orders and what hangs off them, keeps the 5 offline orders and marks them Delivered. 28 Nov 2026.
-- Run in Supabase -> SQL editor. READ THE PREVIEW (part 1) FIRST: run part 1 on its own, check the list, then run part 2.
-- A real order is one sold offline (channel "offline"). Every other order is treated as a test.
-- What part 2 does:
--   * stops if it does not find exactly 5 offline orders (nothing is changed then)
--   * deletes every other order, its queued or sent messages and its short bill links
--   * VOIDS (does not delete) the invoices of the test orders, so invoice numbers have no gaps and the books stay in order
--   * marks the 5 offline orders Delivered, WITHOUT sending the customer a "delivered" message
--   * does not touch products, stock, photos, settings, sign-ups, reviews, rewards or coupons (see part 3 for those)

-- ============ PART 1: preview (changes nothing). Run this alone first. ============
select (data ->> 'channel') = 'offline' as offline_keep, id, status, total, data -> 'contact' ->> 'name' as customer, created_at
  from orders order by offline_keep desc, created_at;
select count(*) filter (where (data ->> 'channel') = 'offline') as offline_orders_kept,
       count(*) filter (where (data ->> 'channel') is distinct from 'offline') as test_orders_to_delete from orders;

-- ============ PART 2: clean up. Run after checking part 1. ============
begin;
do $$ declare n int; begin
  select count(*) into n from orders where (data ->> 'channel') = 'offline';
  if n <> 5 then raise exception 'Expected 5 offline orders but found %. Nothing was changed.', n; end if;
end $$;

delete from notifications where order_id in (select id from orders where (data ->> 'channel') is distinct from 'offline');
delete from bills where order_id in (select id from orders where (data ->> 'channel') is distinct from 'offline');
update invoices set status = 'Void', void_reason = 'Test order', voided_at = now()
  where order_id in (select id from orders where (data ->> 'channel') is distinct from 'offline') and status = 'Issued';
delete from orders where (data ->> 'channel') is distinct from 'offline';

-- the 5 real offline orders: Delivered, with no customer message
alter table orders disable trigger order_notes;
update orders set status = 'Delivered', data = jsonb_set(data, '{status}', '"Delivered"')
  where (data ->> 'channel') = 'offline' and status <> 'Delivered';
alter table orders enable trigger order_notes;
commit;

-- check: 5 orders left, all Delivered
select id, status, total, data -> 'contact' ->> 'name' as customer from orders order by created_at;
select count(*) as voided_test_invoices from invoices where void_reason = 'Test order';

-- ============ PART 3 (optional, run only what you want after looking) ============
-- Test sign-ups, reviews and so on may look like real ones, so they are NOT deleted above. Look first:
--   select 'subscribers' t, count(*) from subscribers union all select 'reviews', count(*) from reviews
--   union all select 'restock_requests', count(*) from restock_requests union all select 'reminders', count(*) from reminders
--   union all select 'events (analytics)', count(*) from events union all select 'ship_quotes (cache)', count(*) from ship_quotes;
-- Safe to clear (test noise, no customer data): the shipping-quote cache and the rate-limit counters.
--   delete from ship_quotes;
--   delete from hits;
-- Clear test analytics (this also clears real visits so far):
--   delete from events;
-- Delete a test sign-up or review by its id only after you have looked at it:
--   delete from subscribers where contact = 'test@example.com';
