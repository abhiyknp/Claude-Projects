-- Live shipping rates and automatic booking (22 Nov 2026): the only database change they need.
-- Run this whole file once in Supabase: SQL Editor, New query, paste, Run. It is safe to run again.
-- (Running all of schema.sql again does the same thing; this file is the short way.)
-- What it does: adds the ship_quotes table the delivery function writes, and the new place_order that reads it.
-- Nothing changes for customers until the owner ticks "Live shipping rates" in Owner view, Settings.

-- live shipping quotes: the delivery function asks Shiprocket for the quickest courier to a PIN code and saves the price
-- here for 30 minutes. Customers cannot write or read this table; place_order reads it, so a browser can only point at a
-- quote, never invent one.
create table if not exists ship_quotes (
  id uuid primary key, pin text not null, slab numeric not null, value int not null, rate numeric not null, fee int not null,
  courier_id int, courier text, days int, created_at timestamptz not null default now(), expires_at timestamptz not null);
create index if not exists ship_quotes_expiry on ship_quotes (expires_at);
alter table ship_quotes enable row level security; -- no rules on purpose: only the delivery function and place_order use it

create or replace function place_order(o jsonb) returns text language plpgsql security definer set search_path = public as $$
declare
  c jsonb := coalesce(o -> 'contact', '{}'); a jsonb := coalesce(o -> 'address', '{}'); g jsonb := o -> 'gift';
  method text := o ->> 'method'; phone text := norm_phone(c ->> 'phone');
  it jsonb; n int; pieces int := 0; price int; cat text; pname text; plabel text;
  items jsonb := '[]'; skus text[] := '{}'; candles int[] := '{}'; objects int[] := '{}';
  sub int := 0; ritual int := 0; code_off int := 0; ship int := 0; wrap int := 0; cod int := 0; total int; code text := '';
  gift_on boolean := false; gift jsonb := null; new_id text; st text;
  em text := customer_email(); use_pts int := 0; earned int := 0;
  grams numeric := 0; pg numeric; kg_band numeric; flat int; q ship_quotes%rowtype; sq jsonb := null;
  card text := upper(trim(coalesce(o ->> 'card', ''))); card_off int := 0; bal int; ref text := null; cpn jsonb;
begin
  -- no guest orders: the customer signs in first
  if em is null then raise exception 'sign_in'; end if;
  perform release_unpaid();
  if random() < 0.05 then delete from ship_quotes where expires_at < now() - interval '1 day'; end if;
  -- how often: per connection, per phone, and for the whole shop
  perform hit('order', client_key(), 5, '1 hour');
  perform hit('order-site', 'site', greatest(cfg_num('maxOrdersHour', 40), 1)::int, '1 hour');

  -- who and where
  if jsonb_typeof(o) <> 'object' or jsonb_typeof(o -> 'items') <> 'array' then raise exception 'bad_order'; end if;
  if length(coalesce(c ->> 'name', '')) not between 1 and 80 then raise exception 'bad_order:name'; end if;
  if phone is null then raise exception 'bad_order:phone'; end if;
  if length(coalesce(a ->> 'line1', '')) not between 1 and 200 or length(coalesce(a ->> 'line2', '')) > 200 then raise exception 'bad_order:address'; end if;
  if coalesce(a ->> 'pin', '') !~ '^[1-9][0-9]{5}$' then raise exception 'bad_order:pin'; end if;
  if length(coalesce(a ->> 'city', '')) not between 1 and 80 or length(coalesce(a ->> 'state', '')) not between 1 and 60 then raise exception 'bad_order:address'; end if;
  -- Online: paid through Razorpay (functions/pay). Gift card or points: only when they cover the whole total.
  if method is null or method not in ('Online', 'UPI QR', 'Gift card or points', 'Cash on delivery') then raise exception 'bad_order:method'; end if;
  -- Online (Razorpay) is only offered once the owner turns it on in Settings (onlineOn); until then checkout shows UPI QR only
  if method = 'Online' and not cfg_on('onlineOn', false) then raise exception 'bad_order:online_off'; end if;
  -- UPI QR is the owner's manual fallback while the gateway is not live: only when switched on and a UPI ID is set
  if method = 'UPI QR' and not (cfg_on('upiQrOn', false) and cfg_text('upiId', '') ~ '^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$') then raise exception 'bad_order:upi_off'; end if;
  -- the shop is prepaid: cash on delivery stays off unless the owner turns it on in Settings
  if method = 'Cash on delivery' and not cfg_on('codOn', false) then raise exception 'bad_order:cod_off'; end if;
  perform hit('order-phone', phone, 3, '1 day');
  if jsonb_typeof(g) = 'object' and coalesce(g ->> 'on', 'false') = 'true' then
    gift_on := true;
    if length(coalesce(g ->> 'name', '')) not between 1 and 80 or length(coalesce(g ->> 'note', '')) > 200
      or (coalesce(g ->> 'phone', '') <> '' and norm_phone(g ->> 'phone') is null)
      or (coalesce(g ->> 'date', '') <> '' and (g ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'bad_order:gift'; end if;
    gift := jsonb_build_object('on', true, 'wrap', coalesce(g ->> 'wrap', 'false') = 'true', 'name', g ->> 'name',
      'phone', coalesce(norm_phone(g ->> 'phone'), ''), 'note', coalesce(g ->> 'note', ''), 'date', coalesce(g ->> 'date', ''));
  end if;

  -- what: every price from the products table, a sensible amount of each
  if jsonb_array_length(o -> 'items') not between 1 and 20 then raise exception 'bad_order:items'; end if;
  for it in select * from jsonb_array_elements(o -> 'items') loop
    if coalesce(it ->> 'qty', '') !~ '^[0-9]{1,3}$' then raise exception 'bad_quantity'; end if;
    n := (it ->> 'qty')::int;
    if n < 1 or n > greatest(cfg_num('maxQty', 5), 1) then raise exception 'bad_quantity'; end if;
    if (it ->> 'sku') = any (skus) then raise exception 'bad_order:items'; end if;
    skus := skus || (it ->> 'sku');
    select (v ->> 'price')::int, p.data ->> 'cat', p.data ->> 'name', v ->> 'label',
      round(case when p.data ->> 'weight' ~ '^[0-9]{1,5}(\.[0-9]+)?$' then (p.data ->> 'weight')::numeric else cfg_num('pieceG', 300) end) into price, cat, pname, plabel, pg
      from products p, jsonb_array_elements(p.data -> 'variants') v where p.live and v ->> 'sku' = it ->> 'sku' limit 1;
    if price is null then raise exception 'unknown_item:%', it ->> 'sku'; end if;
    pieces := pieces + n;
    sub := sub + price * n;
    grams := grams + pg * n;
    for i in 1 .. n loop if cat = 'candles' then candles := candles || price; else objects := objects || price; end if; end loop;
    items := items || jsonb_build_object('sku', it ->> 'sku', 'name', pname, 'label', plabel, 'price', price, 'qty', n);
    update stock set qty = qty - n, updated_at = now() where sku = it ->> 'sku' and qty >= n;
    if not found then raise exception 'sold_out:%', it ->> 'sku'; end if;
  end loop;
  if pieces > greatest(cfg_num('maxPieces', 10), 1) then raise exception 'bad_quantity'; end if;

  -- the money, worked out the same way as the checkout page
  if cfg_num('ritualOff', 10) > 0 then
    select coalesce(sum(x.cp + x.op), 0)::int into ritual from (
      select cp, op from (select cp, row_number() over (order by cp desc) i from unnest(candles) cp) cc
      join (select op, row_number() over (order by op desc) i from unnest(objects) op) oo using (i)) x;
    ritual := round(ritual * cfg_num('ritualOff', 10) / 100);
  end if;
  if coalesce(o ->> 'code', '') <> '' then
    cpn := coupon_off(o ->> 'code', sub - ritual, em, true);
    code := cpn ->> 'code'; code_off := (cpn ->> 'off')::int;
  end if;
  -- shipping: the flat fee, or, when the owner has switched on live rates, the fee from the Shiprocket quote this browser
  -- points at (it must be for this PIN, this weight and still fresh). Free over the owner's limit.
  kg_band := greatest(ceil((grams + cfg_num('packG', 100)) / 500.0) * 0.5, 0.5);
  flat := round(cfg_num('shipFee', 99));
  if cfg_on('shipAuto', false) and coalesce(o ->> 'quote', '') <> '' then
    if (o ->> 'quote') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'ship_quote'; end if;
    select * into q from ship_quotes sq_ where sq_.id = (o ->> 'quote')::uuid and sq_.pin = a ->> 'pin' and sq_.slab = kg_band and sq_.expires_at > now();
    if not found then raise exception 'ship_quote'; end if;
    flat := q.fee;
    sq := jsonb_build_object('id', q.id, 'rate', q.rate, 'courier_id', q.courier_id, 'courier', q.courier, 'days', q.days, 'kg', q.slab);
  end if;
  ship := case when sub = 0 then 0
    when cfg_num('freeOver', 1999) > 0 and sub >= cfg_num('freeOver', 1999) then 0
    else flat end;
  if gift_on and (gift ->> 'wrap')::boolean then wrap := round(cfg_num('wrapFee', 99)); end if;
  if method = 'Cash on delivery' then cod := round(cfg_num('codFee', 49)); end if;
  -- Bud Points: 1 point is ₹1 off the pieces, up to what the customer has; one order at a time per customer
  if coalesce(o ->> 'usePoints', '0') !~ '^[0-9]{1,6}$' then raise exception 'bad_order'; end if;
  use_pts := coalesce((o ->> 'usePoints')::int, 0);
  if use_pts > 0 then
    perform pg_advisory_xact_lock(hashtext('points:' || em));
    if use_pts > (points_of(em) ->> 'available')::int or use_pts > sub - ritual - code_off then raise exception 'points_changed'; end if;
  end if;
  total := sub - ritual - code_off - use_pts + ship + wrap + cod;
  earned := floor((total - ship - wrap - cod) * greatest(cfg_num('rewardPct', 5), 0) / 100);
  -- a gift card pays for as much of the total as its balance covers, and the balance goes down in the same step
  if card <> '' then
    perform hit('card', client_key(), 20, '1 hour');
    select gc.balance into bal from gift_cards gc where gc.code = card for update;
    if coalesce(bal, 0) <= 0 then raise exception 'bad_card'; end if;
    card_off := least(bal, total); total := total - card_off;
    update gift_cards gc set balance = gc.balance - card_off where gc.code = card;
  end if;
  -- an order through a friend's share link is credited to that friend (never to yourself)
  if coalesce(o ->> 'ref', '') ~ '^[A-Z0-9]{6}$' then
    select id into ref from referrers where id = o ->> 'ref' and contact <> phone and contact <> em;
  end if;
  if (method = 'Gift card or points') <> (total = 0) then raise exception 'price_changed'; end if;
  -- the browser showed the customer a total; if it isn't this one, something changed and they should look again
  if coalesce(o ->> 'sub', '') <> sub::text or coalesce(o ->> 'total', '') <> total::text then raise exception 'price_changed'; end if;

  st := case when method in ('Cash on delivery', 'Gift card or points') then 'Placed' else 'Awaiting payment' end;
  new_id := 'BT-' || nextval('order_no') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into orders (id, data, status, phone, total, method) values (new_id, jsonb_build_object(
    'id', new_id, 'placedAt', now(), 'method', method, 'items', items,
    'email', em, 'contact', jsonb_build_object('name', trim(c ->> 'name'), 'phone', phone, 'email', em),
    'address', jsonb_build_object('line1', trim(a ->> 'line1'), 'line2', coalesce(a ->> 'line2', ''), 'pin', a ->> 'pin', 'city', trim(a ->> 'city'), 'state', a ->> 'state'),
    'sub', sub, 'ritual', ritual, 'code', code, 'codeOff', code_off, 'pointsUsed', use_pts, 'points', earned, 'ship', ship, 'shipQuote', sq, 'shipKg', kg_band, 'wrap', wrap, 'cod', cod, 'total', total,
    'gift', gift, 'optin', coalesce(o ->> 'optin', 'false') = 'true', 'card', nullif(card, ''), 'cardOff', card_off, 'ref', ref,
    'src', case when o ->> 'src' ~ '^[a-z0-9._-]{1,40}$' then o ->> 'src' end), st, phone, total, method);
  perform remember_details(em, trim(c ->> 'name'), phone, case when gift_on then null else a end);
  return new_id;
end $$;

-- the same rule as schema.sql: customers may call it, the public may not
revoke execute on function place_order(jsonb) from public, anon;
grant execute on function place_order(jsonb) to authenticated;

-- check: this should show 1 in the second column of each of the two rows
select 'ship_quotes table' as what, count(*) as found from information_schema.tables where table_schema = 'public' and table_name = 'ship_quotes'
union all
select 'place_order reads quotes', count(*) from pg_proc where proname = 'place_order' and prosrc like '%ship_quotes%';
