-- BUD & THINGS · database schema for Supabase (Postgres + storage).
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
-- Everything the site shows that can change without a code change lives here; the owner edits it from the
-- website's Owner view (#admin) after signing in. See README.md in this folder for the setup steps.

-- ---------- who may edit ----------
-- The owner is the signed-in account whose confirmed email is in this table. With the second step on, that sign-in
-- must also have passed the authenticator app code ("aal2"), so a stolen password alone can change nothing.
-- The second step is OFF until launch. To turn it on: change `false` to `true` in owner_two_step() below, run this
-- file again, and set ownerTwoStep: true in prototype/config.js.
create table if not exists owners (email text primary key);
create or replace function owner_two_step() returns boolean language sql immutable as $$ select false $$;
create or replace function is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select (not owner_two_step() or coalesce(auth.jwt() ->> 'aal', '') = 'aal2') and exists (
    select 1 from auth.users u join owners o on lower(o.email) = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;

-- ---------- content ----------
create table if not exists products (id text primary key, data jsonb not null, sort int not null default 0, live boolean not null default true, updated_at timestamptz not null default now());
create table if not exists pairings (id text primary key, data jsonb not null, sort int not null default 0, live boolean not null default true, updated_at timestamptz not null default now());
create table if not exists site_text (key text primary key, value text not null, updated_at timestamptz not null default now());
create table if not exists settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table if not exists stock (sku text primary key, qty int not null default 0 check (qty >= 0), updated_at timestamptz not null default now());
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,            -- a product id, a pairing id, or 'brand' for packaging, gifting, founder and process shots
  variant text,                        -- an option label such as '220 g' or 'Sand'; empty means every option
  kind text not null check (kind in ('photo', 'video')),
  role text not null,                  -- packshot, lifestyle, detail, hand, lit, loop, packaging, gift, unboxing, ritual, founder, process, story
  path text not null,                  -- file path in the "media" bucket
  alt text not null default '',
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- what visitors send ----------
create sequence if not exists order_no start 1001;
create table if not exists orders (id text primary key, data jsonb not null, status text not null default 'Placed', phone text, total int, created_at timestamptz not null default now());
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(), product_id text not null, name text not null, rating int not null check (rating between 1 and 5),
  body text not null, published boolean not null default false, created_at timestamptz not null default now());
create table if not exists subscribers (id uuid primary key default gen_random_uuid(), contact text not null, source text, created_at timestamptz not null default now());
create table if not exists restock_requests (id uuid primary key default gen_random_uuid(), sku text not null, contact text not null, created_at timestamptz not null default now());
-- "remind me before their birthday": the owner sees what is coming up and sends one message
create table if not exists reminders (id uuid primary key default gen_random_uuid(), contact text not null, occasion text not null, for_name text, day date not null, created_at timestamptz not null default now());
-- gift cards the owner issues after a card is paid for (or as a thank-you); spent at checkout until the balance is 0
create table if not exists gift_cards (code text primary key, amount int not null check (amount > 0), balance int not null check (balance >= 0), note text, created_at timestamptz not null default now());
-- a customer's share link (?ref=ABC123): orders placed through it are credited to them, and the owner sends the thank-you
create table if not exists referrers (id text primary key, contact text not null unique, created_at timestamptz not null default now());
-- a signed-in customer's saved details: name, mobile, up to 5 delivery addresses (the first is the usual one) and the
-- extra channels they want order updates on. Keyed by the email they sign in with; read and changed only through
-- my_profile() and save_profile() below.
create table if not exists profiles (email text primary key, name text not null default '', phone text not null default '',
  addresses jsonb not null default '[]', prefs jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
-- every message the shop sends (email now; SMS, WhatsApp and app push once a provider is set up), queued by the
-- database when something happens and sent by the notify function (supabase/functions/notify). `ref` names the
-- happening, such as BT-1042-7F3A9C:shipped, so each one is sent once per channel however often it's reported.
create table if not exists notifications (id uuid primary key default gen_random_uuid(), event text not null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'push')), recipient text not null, ref text not null,
  order_id text, data jsonb not null default '{}', status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  tries int not null default 0, error text, claimed_at timestamptz, sent_at timestamptz, created_at timestamptz not null default now());
create unique index if not exists notifications_once on notifications (channel, ref);
create index if not exists notifications_queue on notifications (status, created_at);
alter table restock_requests add column if not exists notified_at timestamptz;

-- ---------- limits ----------
-- Every visitor action is counted per connection (a one-way hash of the IP address, never the address itself), per
-- phone number where there is one, and for the whole site, so a script can't flood the lists or buy up the stock.
create table if not exists hits (bucket text not null, who text not null, at timestamptz not null default now());
create index if not exists hits_lookup on hits (bucket, who, at);

-- the visitor's address as Supabase's gateway reports it (Cloudflare's header can't be set by the visitor)
create or replace function client_key() returns text language sql stable as $$
  select md5(coalesce(nullif(h ->> 'cf-connecting-ip', ''), nullif(h ->> 'x-real-ip', ''),
    nullif(trim(split_part(h ->> 'x-forwarded-for', ',', 1)), ''), 'unknown'))
  from (select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json h) x;
$$;

-- count one action; refuse it once there have been max_n in the window
create or replace function hit(b text, w text, max_n int, per interval) returns void language plpgsql security definer set search_path = public as $$
begin
  if random() < 0.02 then delete from hits where at < now() - interval '2 days'; end if;
  if (select count(*) from hits where bucket = b and who = w and at > now() - per) >= max_n then
    raise exception 'too_many_requests';
  end if;
  insert into hits (bucket, who) values (b, w);
end $$;

-- a number or switch from settings, read the way the site reads it (missing: the site's default; not a number: 0)
create or replace function cfg_num(k text, d numeric) returns numeric language sql stable security definer set search_path = public as $$
  select case when not exists (select 1 from settings where key = k) then d
    else coalesce((select case when value #>> '{}' ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' then (value #>> '{}')::numeric end from settings where key = k), 0) end;
$$;
create or replace function cfg_on(k text, d boolean) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value not in ('false'::jsonb, '0'::jsonb, '""'::jsonb, 'null'::jsonb) from settings where key = k), d);
$$;
create or replace function cfg_text(k text, d text) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select value #>> '{}' from settings where key = k), d);
$$;

-- ---------- rules ----------
alter table owners enable row level security;
alter table products enable row level security;
alter table pairings enable row level security;
alter table site_text enable row level security;
alter table settings enable row level security;
alter table stock enable row level security;
alter table media enable row level security;
alter table orders enable row level security;
alter table reviews enable row level security;
alter table subscribers enable row level security;
alter table restock_requests enable row level security;
alter table reminders enable row level security;
alter table gift_cards enable row level security;
alter table referrers enable row level security;
alter table profiles enable row level security;
alter table notifications enable row level security;
alter table hits enable row level security; -- no rules on purpose: only the functions here read or write it
revoke all on hits from anon, authenticated;

do $$
declare t text;
begin
  -- drop and recreate so the file can be run again
  for t in select unnest(array['products','pairings','site_text','settings','stock','media','orders','reviews','subscribers','restock_requests','reminders','gift_cards','referrers','profiles','notifications','owners']) loop
    execute format('drop policy if exists "read" on %I', t);
    execute format('drop policy if exists "owner" on %I', t);
    execute format('drop policy if exists "visitor" on %I', t);
  end loop;
end $$;

create policy "owner" on owners for select using (is_owner());
create policy "read" on products for select using (live or is_owner());
create policy "read" on pairings for select using (live or is_owner());
create policy "read" on site_text for select using (true);
create policy "read" on settings for select using (true);
create policy "read" on stock for select using (true);
create policy "read" on media for select using (published or is_owner());
create policy "read" on reviews for select using (published or is_owner());
create policy "owner" on products for all using (is_owner()) with check (is_owner());
create policy "owner" on pairings for all using (is_owner()) with check (is_owner());
create policy "owner" on site_text for all using (is_owner()) with check (is_owner());
create policy "owner" on settings for all using (is_owner()) with check (is_owner());
create policy "owner" on stock for all using (is_owner()) with check (is_owner());
create policy "owner" on media for all using (is_owner()) with check (is_owner());
create policy "owner" on orders for all using (is_owner()) with check (is_owner());
create policy "owner" on reviews for all using (is_owner()) with check (is_owner());
create policy "owner" on subscribers for all using (is_owner()) with check (is_owner());
create policy "owner" on restock_requests for all using (is_owner()) with check (is_owner());
create policy "owner" on reminders for all using (is_owner()) with check (is_owner());
create policy "owner" on gift_cards for all using (is_owner()) with check (is_owner());
create policy "owner" on referrers for all using (is_owner()) with check (is_owner());
create policy "owner" on profiles for select using (is_owner());
create policy "owner" on notifications for select using (is_owner());
-- visitors may send a review (held until the owner publishes it), sign up, or ask to hear about a restock
create policy "visitor" on reviews for insert with check (not published and length(name) between 1 and 60 and length(body) between 1 and 1500 and length(product_id) < 60);
create policy "visitor" on subscribers for insert with check (length(contact) between 5 and 120 and length(coalesce(source, '')) <= 40);
create policy "visitor" on restock_requests for insert with check (length(contact) between 5 and 120 and length(sku) < 60);
create policy "visitor" on reminders for insert with check (length(contact) between 5 and 120 and length(occasion) <= 30 and length(coalesce(for_name, '')) <= 60);

-- what a visitor sends is checked, tidied and counted before it is saved
create or replace function guard_visitor() returns trigger language plpgsql security definer set search_path = public as $$
declare me text := client_key();
begin
  if is_owner() then return new; end if;
  new.created_at := now();
  if tg_table_name = 'reviews' then
    new.id := gen_random_uuid(); new.published := false; new.name := trim(new.name); new.body := trim(new.body);
    if not exists (select 1 from products where id = new.product_id and live) then raise exception 'unknown_item'; end if;
    perform hit('review', me, 3, '1 hour'); perform hit('review', 'site', 60, '1 hour');
  elsif tg_table_name = 'subscribers' then
    new.id := gen_random_uuid(); new.contact := lower(trim(new.contact));
    if new.contact !~ '^([^\s@]+@[^\s@]+\.[^\s@]+|[6-9][0-9]{9})$' then raise exception 'bad_contact'; end if;
    if new.source is not null and new.source !~ '^[a-z0-9-]{1,40}$' then raise exception 'bad_source'; end if;
    perform hit('signup', me, 5, '1 hour'); perform hit('signup', 'site', 300, '1 hour');
    if exists (select 1 from subscribers where contact = new.contact) then return null; end if; -- already signed up
  elsif tg_table_name = 'restock_requests' then
    new.id := gen_random_uuid(); new.contact := lower(trim(new.contact));
    if new.contact !~ '^([^\s@]+@[^\s@]+\.[^\s@]+|[6-9][0-9]{9})$' then raise exception 'bad_contact'; end if;
    if not exists (select 1 from products p, jsonb_array_elements(p.data -> 'variants') v where p.live and v ->> 'sku' = new.sku) then raise exception 'unknown_item'; end if;
    perform hit('restock', me, 10, '1 hour'); perform hit('restock', 'site', 300, '1 hour');
    if exists (select 1 from restock_requests where sku = new.sku and contact = new.contact) then return null; end if;
  elsif tg_table_name = 'reminders' then
    new.id := gen_random_uuid(); new.contact := lower(trim(new.contact)); new.for_name := nullif(trim(coalesce(new.for_name, '')), '');
    if new.contact !~ '^([^\s@]+@[^\s@]+\.[^\s@]+|[6-9][0-9]{9})$' then raise exception 'bad_contact'; end if;
    if new.occasion !~ '^[a-z-]{1,30}$' or new.day < current_date - 1 or new.day > current_date + 400 then raise exception 'bad_reminder'; end if;
    perform hit('reminder', me, 10, '1 hour'); perform hit('reminder', 'site', 300, '1 hour');
    if exists (select 1 from reminders where contact = new.contact and occasion = new.occasion and day = new.day) then return null; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_visitor on reviews;
drop trigger if exists guard_visitor on subscribers;
drop trigger if exists guard_visitor on restock_requests;
drop trigger if exists guard_visitor on reminders;
create trigger guard_visitor before insert on reviews for each row execute function guard_visitor();
create trigger guard_visitor before insert on subscribers for each row execute function guard_visitor();
create trigger guard_visitor before insert on restock_requests for each row execute function guard_visitor();
create trigger guard_visitor before insert on reminders for each row execute function guard_visitor();

-- ---------- placing an order ----------
-- The database rebuilds the order from what it knows: each price from the products table, the ritual saving, the
-- welcome code, shipping, gift wrap and the cash on delivery fee from settings, so the total can't be changed from the
-- browser. It checks every field, limits how much one order and one visitor can take, and takes the stock off in the
-- same step, so two people can never buy the last piece.
-- Until a payment gateway confirms payment, an order paid online waits as "Awaiting payment" and its stock is held for
-- payHoldMins minutes (120 unless set), then released. Cash on delivery orders start as "Placed".
-- The order number has a random part (BT-1042-7F3A9C), so nobody can look up other people's orders by counting.
alter table orders add column if not exists method text;

create or replace function release_unpaid() returns void language plpgsql security definer set search_path = public as $$
declare r record; it jsonb;
begin
  for r in select id, data from orders where status = 'Awaiting payment'
      and created_at < now() - make_interval(mins => greatest(cfg_num('payHoldMins', 120), 5)::int) for update skip locked loop
    for it in select * from jsonb_array_elements(r.data -> 'items') loop
      update stock set qty = qty + (it ->> 'qty')::int, updated_at = now() where sku = it ->> 'sku';
    end loop;
    update gift_cards set balance = balance + coalesce((r.data ->> 'cardOff')::int, 0) where code = r.data ->> 'card';
    update orders set status = 'Cancelled' where id = r.id;
  end loop;
end $$;

-- ---------- customers ----------
-- Customers sign in with a 6-digit code emailed by Supabase. Their email comes from that session, never from the page,
-- so an order and its Bud Points always belong to the inbox that proved itself.
create or replace function customer_email() returns text language sql stable security definer set search_path = public as $$
  select lower(u.email) from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null
$$;
create index if not exists orders_email on orders ((data ->> 'email'));
-- Bud Points: earned points count once the order is delivered; points spent are held from the moment the order is placed
-- and come back if it is cancelled
create or replace function points_of(em text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'available', greatest(0, coalesce(sum(case when status = 'Delivered' then coalesce((data ->> 'points')::int, 0) else 0 end), 0)
      - coalesce(sum(case when status <> 'Cancelled' then coalesce((data ->> 'pointsUsed')::int, 0) else 0 end), 0))::int,
    'pending', coalesce(sum(case when status in ('Placed', 'Packed', 'Shipped') then coalesce((data ->> 'points')::int, 0) else 0 end), 0)::int)
  from orders where data ->> 'email' = em
$$;
-- a signed-in customer's own orders (newest 50) and points
create or replace function my_orders() returns jsonb language plpgsql security definer set search_path = public as $$
declare em text := customer_email();
begin
  if em is null then raise exception 'sign_in'; end if;
  perform hit('mine', em, 60, '1 hour');
  return jsonb_build_object('points', points_of(em), 'orders', coalesce((select jsonb_agg(x.d order by x.created_at desc) from (
    select data || jsonb_build_object('status', status) d, created_at from orders where data ->> 'email' = em order by created_at desc limit 50) x), '[]'::jsonb));
end $$;

create or replace function place_order(o jsonb) returns text language plpgsql security definer set search_path = public as $$
declare
  c jsonb := coalesce(o -> 'contact', '{}'); a jsonb := coalesce(o -> 'address', '{}'); g jsonb := o -> 'gift';
  method text := o ->> 'method'; phone text := c ->> 'phone';
  it jsonb; n int; pieces int := 0; price int; cat text; pname text; plabel text;
  items jsonb := '[]'; skus text[] := '{}'; candles int[] := '{}'; objects int[] := '{}';
  sub int := 0; ritual int := 0; code_off int := 0; ship int := 0; wrap int := 0; cod int := 0; total int; code text := '';
  gift_on boolean := false; gift jsonb := null; new_id text; st text;
  em text := customer_email(); use_pts int := 0; earned int := 0;
  card text := upper(trim(coalesce(o ->> 'card', ''))); card_off int := 0; bal int; ref text := null;
begin
  -- no guest orders: the customer signs in first
  if em is null then raise exception 'sign_in'; end if;
  perform release_unpaid();
  -- how often: per connection, per phone, and for the whole shop
  perform hit('order', client_key(), 5, '1 hour');
  perform hit('order-site', 'site', greatest(cfg_num('maxOrdersHour', 40), 1)::int, '1 hour');

  -- who and where
  if jsonb_typeof(o) <> 'object' or jsonb_typeof(o -> 'items') <> 'array' then raise exception 'bad_order'; end if;
  if length(coalesce(c ->> 'name', '')) not between 1 and 80 then raise exception 'bad_order:name'; end if;
  if coalesce(phone, '') !~ '^[6-9][0-9]{9}$' then raise exception 'bad_order:phone'; end if;
  if length(coalesce(a ->> 'line1', '')) not between 1 and 200 or length(coalesce(a ->> 'line2', '')) > 200 then raise exception 'bad_order:address'; end if;
  if coalesce(a ->> 'pin', '') !~ '^[1-9][0-9]{5}$' then raise exception 'bad_order:pin'; end if;
  if length(coalesce(a ->> 'city', '')) not between 1 and 80 or length(coalesce(a ->> 'state', '')) not between 1 and 60 then raise exception 'bad_order:address'; end if;
  -- Online: paid through Cashfree (functions/pay). Gift card or points: only when they cover the whole total.
  if method is null or method not in ('Online', 'Gift card or points', 'Cash on delivery') then raise exception 'bad_order:method'; end if;
  -- the shop is prepaid: cash on delivery stays off unless the owner turns it on in Settings
  if method = 'Cash on delivery' and not cfg_on('codOn', false) then raise exception 'bad_order:cod_off'; end if;
  perform hit('order-phone', phone, 3, '1 day');
  if jsonb_typeof(g) = 'object' and coalesce(g ->> 'on', 'false') = 'true' then
    gift_on := true;
    if length(coalesce(g ->> 'name', '')) not between 1 and 80 or length(coalesce(g ->> 'note', '')) > 200
      or (coalesce(g ->> 'phone', '') <> '' and (g ->> 'phone') !~ '^[6-9][0-9]{9}$')
      or (coalesce(g ->> 'date', '') <> '' and (g ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'bad_order:gift'; end if;
    gift := jsonb_build_object('on', true, 'wrap', coalesce(g ->> 'wrap', 'false') = 'true', 'name', g ->> 'name',
      'phone', coalesce(g ->> 'phone', ''), 'note', coalesce(g ->> 'note', ''), 'date', coalesce(g ->> 'date', ''));
  end if;

  -- what: every price from the products table, a sensible amount of each
  if jsonb_array_length(o -> 'items') not between 1 and 20 then raise exception 'bad_order:items'; end if;
  for it in select * from jsonb_array_elements(o -> 'items') loop
    if coalesce(it ->> 'qty', '') !~ '^[0-9]{1,3}$' then raise exception 'bad_quantity'; end if;
    n := (it ->> 'qty')::int;
    if n < 1 or n > greatest(cfg_num('maxQty', 5), 1) then raise exception 'bad_quantity'; end if;
    if (it ->> 'sku') = any (skus) then raise exception 'bad_order:items'; end if;
    skus := skus || (it ->> 'sku');
    select (v ->> 'price')::int, p.data ->> 'cat', p.data ->> 'name', v ->> 'label' into price, cat, pname, plabel
      from products p, jsonb_array_elements(p.data -> 'variants') v where p.live and v ->> 'sku' = it ->> 'sku' limit 1;
    if price is null then raise exception 'unknown_item:%', it ->> 'sku'; end if;
    pieces := pieces + n;
    sub := sub + price * n;
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
    if cfg_text('welcomeCode', 'HELLO10') = '' or upper(trim(o ->> 'code')) <> upper(trim(cfg_text('welcomeCode', 'HELLO10'))) then raise exception 'price_changed'; end if;
    code := upper(trim(o ->> 'code'));
    code_off := round((sub - ritual) * cfg_num('welcomeOff', 10) / 100);
  end if;
  ship := case when sub = 0 then 0 when cfg_num('freeOver', 1999) > 0 and sub >= cfg_num('freeOver', 1999) then 0 else round(cfg_num('shipFee', 99)) end;
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
    'sub', sub, 'ritual', ritual, 'code', code, 'codeOff', code_off, 'pointsUsed', use_pts, 'points', earned, 'ship', ship, 'wrap', wrap, 'cod', cod, 'total', total,
    'gift', gift, 'optin', coalesce(o ->> 'optin', 'false') = 'true', 'card', nullif(card, ''), 'cardOff', card_off, 'ref', ref), st, phone, total, method);
  perform remember_details(em, trim(c ->> 'name'), phone, case when gift_on then null else a end);
  return new_id;
end $$;

-- a customer can look up their own order with its number and their phone number (20 tries an hour per connection)
drop function if exists get_order(text, text);
create function get_order(order_id text, phone_no text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform hit('lookup', client_key(), 20, '1 hour');
  return (select data || jsonb_build_object('status', status) from orders where id = upper(trim(order_id)) and phone = phone_no);
end $$;

-- the owner cancels an order that hasn't shipped; its pieces go back into stock
create or replace function cancel_order(order_id text) returns void language plpgsql security definer set search_path = public as $$
declare r record; it jsonb;
begin
  if not is_owner() then raise exception 'not_allowed'; end if;
  select id, data, status into r from orders where id = order_id for update;
  if r.id is null or r.status not in ('Awaiting payment', 'Placed', 'Packed') then raise exception 'cannot_cancel'; end if;
  for it in select * from jsonb_array_elements(r.data -> 'items') loop
    update stock set qty = qty + (it ->> 'qty')::int, updated_at = now() where sku = it ->> 'sku';
  end loop;
  update gift_cards set balance = balance + coalesce((r.data ->> 'cardOff')::int, 0) where code = r.data ->> 'card';
  update orders set status = 'Cancelled' where id = r.id;
end $$;

-- ---------- online payment (Cashfree) and delivery (Shiprocket) ----------
-- Only the pay and delivery functions (supabase/functions) call these, with the service key; visitors and the owner can't.

-- Cashfree confirmed the payment. Usually the order is still waiting, and moves on to Placed. If it was paid after its
-- hold ran out (and was cancelled), the pieces and gift card balance are taken again when they're still there;
-- otherwise it stays cancelled and is marked refundDue so the owner refunds it in the Cashfree dashboard.
create or replace function mark_paid(order_id text, pay jsonb) returns text language plpgsql security definer set search_path = public as $$
declare r record; it jsonb; ok boolean := true;
begin
  select id, data, status into r from orders where id = order_id for update;
  if r.id is null then raise exception 'not_found'; end if;
  if r.data ? 'payment' then return r.status; end if; -- already recorded (the browser and the webhook both report it)
  if r.status = 'Cancelled' then
    begin
      for it in select * from jsonb_array_elements(r.data -> 'items') loop
        update stock set qty = qty - (it ->> 'qty')::int, updated_at = now() where sku = it ->> 'sku' and qty >= (it ->> 'qty')::int;
        if not found then raise exception 'gone'; end if;
      end loop;
      if coalesce((r.data ->> 'cardOff')::int, 0) > 0 then
        update gift_cards set balance = balance - (r.data ->> 'cardOff')::int where code = r.data ->> 'card' and balance >= (r.data ->> 'cardOff')::int;
        if not found then raise exception 'gone'; end if;
      end if;
    exception when others then ok := false; -- undoes the partial stock changes above
    end;
    update orders set status = case when ok then 'Placed' else 'Cancelled' end,
      data = data || jsonb_build_object('payment', pay, 'refundDue', not ok) where id = r.id;
    return case when ok then 'Placed' else 'Cancelled' end;
  end if;
  update orders set status = case when status = 'Awaiting payment' then 'Placed' else status end,
    data = data || jsonb_build_object('payment', pay) where id = r.id;
  return (select status from orders where id = r.id);
end $$;

-- Shiprocket booked a courier, or reported where the parcel is. The status only moves forward (Packed → Shipped →
-- Delivered), never back, and never for a cancelled or unpaid order.
create or replace function set_shipment(order_id text, ship jsonb, new_status text) returns text language plpgsql security definer set search_path = public as $$
declare cur text; steps text[] := array['Placed', 'Packed', 'Shipped', 'Delivered'];
begin
  select status into cur from orders where id = order_id for update;
  if cur is null then raise exception 'not_found'; end if;
  update orders set data = data || jsonb_build_object('parcel', coalesce(data -> 'parcel', '{}') || ship),
    status = case when new_status = any (steps) and cur = any (steps) and array_position(steps, new_status) > array_position(steps, cur)
      then new_status else status end where id = order_id;
  return (select status from orders where id = order_id);
end $$;

-- the owner marks an order as running late (or clears it): { reason, note, until (a date or ''), tell (email the customer), at }.
-- It is a flag on the order, not a new step, so Packed, Shipped and Delivered, Bud Points and tracking carry on as before.
create or replace function set_delay(order_id text, d jsonb) returns void language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  if not is_owner() then raise exception 'not_allowed'; end if;
  select status into cur from orders where id = order_id for update;
  if cur is null then raise exception 'not_found'; end if;
  if d is null or jsonb_typeof(d) <> 'object' then
    update orders set data = data - 'delay' where id = order_id;
    return;
  end if;
  if cur not in ('Placed', 'Packed', 'Shipped') then raise exception 'cannot_delay'; end if;
  if length(coalesce(d ->> 'reason', '')) not between 1 and 120 or length(coalesce(d ->> 'note', '')) > 300
    or (coalesce(d ->> 'until', '') <> '' and (d ->> 'until') !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'bad_delay'; end if;
  update orders set data = data || jsonb_build_object('delay', jsonb_build_object('reason', trim(d ->> 'reason'), 'note', trim(coalesce(d ->> 'note', '')),
    'until', coalesce(d ->> 'until', ''), 'tell', coalesce(d ->> 'tell', 'false') = 'true', 'at', now())) where id = order_id;
end $$;

-- a shopper checks a gift card before using it (20 tries an hour per connection, so codes can't be guessed)
create or replace function gift_card_balance(card_code text) returns int language plpgsql security definer set search_path = public as $$
begin
  perform hit('card', client_key(), 20, '1 hour');
  return (select balance from gift_cards where code = upper(trim(card_code)));
end $$;

-- a customer asks for their share link; the same mobile or email always gets the same link
create or replace function my_referral(contact_in text) returns text language plpgsql security definer set search_path = public as $$
declare who text := lower(trim(contact_in)); rid text;
begin
  perform hit('referral', client_key(), 5, '1 hour');
  if who !~ '^([^\s@]+@[^\s@]+\.[^\s@]+|[6-9][0-9]{9})$' then raise exception 'bad_contact'; end if;
  select id into rid from referrers where contact = who;
  if rid is null then
    loop
      rid := upper(substr(md5(gen_random_uuid()::text), 1, 6));
      exit when not exists (select 1 from referrers where id = rid);
    end loop;
    insert into referrers (id, contact) values (rid, who);
  end if;
  return rid;
end $$;

-- ---------- customer profiles ----------
-- Saved on the account page and filled in from each order, so checkout can offer the customer's own details.
-- An address is { label, line1, line2, pin, city, state }, checked the same way as place_order checks one.
create or replace function ok_address(a jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(a) = 'object' and length(coalesce(a ->> 'line1', '')) between 1 and 200 and length(coalesce(a ->> 'line2', '')) <= 200
    and coalesce(a ->> 'pin', '') ~ '^[1-9][0-9]{5}$' and length(coalesce(a ->> 'city', '')) between 1 and 80
    and length(coalesce(a ->> 'state', '')) between 1 and 60 and length(coalesce(a ->> 'label', '')) <= 30
$$;
create or replace function clean_address(a jsonb) returns jsonb language sql immutable as $$
  select jsonb_build_object('label', trim(coalesce(a ->> 'label', '')), 'line1', trim(a ->> 'line1'), 'line2', trim(coalesce(a ->> 'line2', '')),
    'pin', a ->> 'pin', 'city', trim(a ->> 'city'), 'state', a ->> 'state')
$$;
-- after an order: keep the name and mobile if none were saved, and add the address if it's new (never a gift
-- recipient's address, and never more than 5)
create or replace function remember_details(em text, nm text, ph text, addr jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (email, name, phone, addresses) values (em, coalesce(nm, ''), coalesce(ph, ''), case when addr is null then '[]' else jsonb_build_array(clean_address(addr)) end)
  on conflict (email) do update set
    name = case when profiles.name = '' then excluded.name else profiles.name end,
    phone = case when profiles.phone = '' then excluded.phone else profiles.phone end,
    addresses = case when addr is null or jsonb_array_length(profiles.addresses) >= 5 or exists (select 1 from jsonb_array_elements(profiles.addresses) x
        where lower(x ->> 'line1') = lower(trim(addr ->> 'line1')) and x ->> 'pin' = addr ->> 'pin') then profiles.addresses
      else profiles.addresses || jsonb_build_array(clean_address(addr)) end,
    updated_at = now();
end $$;
-- the signed-in customer's saved details; the first time, the name and mobile come from their latest order
create or replace function my_profile() returns jsonb language plpgsql security definer set search_path = public as $$
declare em text := customer_email();
begin
  if em is null then raise exception 'sign_in'; end if;
  perform hit('profile', em, 120, '1 hour');
  insert into profiles (email, name, phone)
    select em, coalesce(o.data -> 'contact' ->> 'name', ''), coalesce(o.phone, '') from (select 1) x
    left join lateral (select data, phone from orders where data ->> 'email' = em order by created_at desc limit 1) o on true
    on conflict (email) do nothing;
  return (select jsonb_build_object('email', p.email, 'name', p.name, 'phone', p.phone, 'addresses', p.addresses, 'prefs', p.prefs) from profiles p where p.email = em);
end $$;
-- the account page saves the whole profile at once: name, mobile, addresses and which extra channels to use
create or replace function save_profile(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare em text := customer_email(); a jsonb; addrs jsonb := '[]'; pf jsonb := coalesce(p -> 'prefs', '{}'); k text;
begin
  if em is null then raise exception 'sign_in'; end if;
  perform hit('profile', em, 120, '1 hour');
  if jsonb_typeof(p) <> 'object' or length(coalesce(p ->> 'name', '')) > 80 then raise exception 'bad_profile:name'; end if;
  if coalesce(p ->> 'phone', '') !~ '^([6-9][0-9]{9})?$' then raise exception 'bad_profile:phone'; end if;
  if jsonb_typeof(coalesce(p -> 'addresses', '[]')) <> 'array' or jsonb_array_length(coalesce(p -> 'addresses', '[]')) > 5 then raise exception 'bad_profile:address'; end if;
  for a in select * from jsonb_array_elements(coalesce(p -> 'addresses', '[]')) loop
    if not ok_address(a) then raise exception 'bad_profile:address'; end if;
    addrs := addrs || jsonb_build_array(clean_address(a));
  end loop;
  if jsonb_typeof(pf) <> 'object' then raise exception 'bad_profile:prefs'; end if;
  for k in select jsonb_object_keys(pf) loop
    if k not in ('whatsapp', 'sms', 'push') or jsonb_typeof(pf -> k) <> 'boolean' then raise exception 'bad_profile:prefs'; end if;
  end loop;
  insert into profiles (email, name, phone, addresses, prefs) values (em, trim(coalesce(p ->> 'name', '')), coalesce(p ->> 'phone', ''), addrs, pf)
  on conflict (email) do update set name = excluded.name, phone = excluded.phone, addresses = excluded.addresses, prefs = excluded.prefs, updated_at = now();
  return my_profile();
end $$;
-- "Clear my saved details": the orders stay (they're the shop's records), everything saved for checkout goes
create or replace function forget_me() returns void language plpgsql security definer set search_path = public as $$
declare em text := customer_email();
begin
  if em is null then raise exception 'sign_in'; end if;
  update profiles set name = '', phone = '', addresses = '[]', prefs = '{}', updated_at = now() where email = em;
end $$;

-- ---------- messages to customers and the owner ----------
-- The database queues a message when something happens; the notify function sends it (supabase/functions/notify).
--   welcome      a customer's first sign-in (not for customers who ordered before profiles existed)
--   confirmed    an order is Placed: paid online, a gift card or points, or cash on delivery (and new_order to the owner)
--   shipped, delivered, cancelled   as the order moves along; delayed when the owner marks it running late and ticks "tell the customer"; refund when a late payment has to go back
--   restock      a piece someone asked about is back in stock
--   reminder     a week before a saved gift date (reminderDays), from the daily run
-- Email always goes to the customer's sign-in address. WhatsApp, SMS and app push are added for customers who chose
-- them, once the owner turns that channel on in Settings (whatsappOn, smsOn, pushOn) after its provider is set up.
create or replace function shop_inbox() returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(cfg_text('orderAlerts', '')), ''), nullif(trim(cfg_text('email', '')), ''), 'hello@budandthings.com')
$$;
create or replace function queue_note(ev text, ch text, rcpt text, rf text, oid text, d jsonb) returns void language sql security definer set search_path = public as $$
  insert into notifications (event, channel, recipient, ref, order_id, data)
    select ev, ch, rcpt, rf, oid, coalesce(d, '{}') where coalesce(rcpt, '') <> ''
  on conflict (channel, ref) do nothing;
$$;
-- one happening, to one customer, on every channel they want. `asked` means they asked for this on that number
-- (the WhatsApp tick at checkout, or a restock or reminder left with a mobile number).
create or replace function tell(ev text, em text, ph text, rf text, oid text, d jsonb, asked boolean) returns void language plpgsql security definer set search_path = public as $$
declare pf jsonb := coalesce((select prefs from profiles where email = em), '{}');
begin
  perform queue_note(ev, 'email', em, rf, oid, d);
  if coalesce(ph, '') ~ '^[6-9][0-9]{9}$' then
    if cfg_on('whatsappOn', false) and (asked or coalesce((pf ->> 'whatsapp')::boolean, false)) then perform queue_note(ev, 'whatsapp', ph, rf, oid, d); end if;
    if cfg_on('smsOn', false) and (coalesce((pf ->> 'sms')::boolean, false) or (asked and em is null and not cfg_on('whatsappOn', false))) then perform queue_note(ev, 'sms', ph, rf, oid, d); end if;
  end if;
  if em is not null and cfg_on('pushOn', false) and coalesce((pf ->> 'push')::boolean, false) then perform queue_note(ev, 'push', em, rf, oid, d); end if;
end $$;

create or replace function order_notes() returns trigger language plpgsql security definer set search_path = public as $$
declare ev text; em text := new.data ->> 'email'; optin boolean := coalesce((new.data ->> 'optin')::boolean, false);
begin
  -- a payment that came after the order was released goes back: tell the owner to refund it, and the customer
  if coalesce((new.data ->> 'refundDue')::boolean, false) and (tg_op = 'INSERT' or not coalesce((old.data ->> 'refundDue')::boolean, false)) then
    perform queue_note('refund_due', 'email', shop_inbox(), new.id || ':refund_due', new.id, '{}');
    perform tell('refund', em, new.phone, new.id || ':refund', new.id, '{}', optin);
  end if;
  -- the owner marked the order as running late and asked to tell the customer (once per time it is marked)
  if tg_op = 'UPDATE' and em is not null and coalesce((new.data -> 'delay' ->> 'tell')::boolean, false) and (new.data -> 'delay' ->> 'at') is distinct from (old.data -> 'delay' ->> 'at') then
    perform tell('delayed', em, new.phone, new.id || ':delayed:' || (new.data -> 'delay' ->> 'at'), new.id, '{}', optin);
  end if;
  -- a new order only ever says "confirmed" (orders copied in with a later status send nothing)
  if tg_op = 'UPDATE' and new.status is not distinct from old.status or tg_op = 'INSERT' and new.status <> 'Placed' then return new; end if;
  ev := case new.status when 'Placed' then 'confirmed' when 'Shipped' then 'shipped' when 'Delivered' then 'delivered' when 'Cancelled' then 'cancelled' end;
  if ev is null or em is null then return new; end if;
  perform tell(ev, em, new.phone, new.id || ':' || ev, new.id, '{}', optin);
  if ev = 'confirmed' then perform queue_note('new_order', 'email', shop_inbox(), new.id || ':new_order', new.id, '{}'); end if;
  return new;
end $$;
drop trigger if exists order_notes on orders;
create trigger order_notes after insert or update on orders for each row execute function order_notes();

-- a customer's first sign-in (or first order) makes their profile: say hello, unless they'd already ordered before
create or replace function welcome_note() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from orders where data ->> 'email' = new.email and created_at < now() - interval '1 hour') then
    perform queue_note('welcome', 'email', new.email, 'welcome:' || new.email, null, '{}');
  end if;
  return new;
end $$;
drop trigger if exists welcome_note on profiles;
create trigger welcome_note after insert on profiles for each row execute function welcome_note();

-- stock goes from none to some (the owner adds a batch, or an unpaid order is released): tell everyone waiting for it
create or replace function restock_notes() returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.qty > 0 and (tg_op = 'INSERT' or old.qty <= 0) then
    for r in select id, contact from restock_requests where sku = new.sku and notified_at is null for update skip locked loop
      perform tell('restock', case when r.contact like '%@%' then r.contact end, case when r.contact not like '%@%' then r.contact end,
        'restock:' || r.id, null, jsonb_build_object('sku', new.sku), true);
      update restock_requests set notified_at = now() where id = r.id;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists restock_notes on stock;
create trigger restock_notes after insert or update of qty on stock for each row execute function restock_notes();

-- the daily run (notify function, action "daily"): queue reminders for saved gift dates coming up in reminderDays days
-- (7 unless set). Dates repeat every year. Each date is reminded once, however often this runs.
create or replace function queue_reminders() returns int language plpgsql security definer set search_path = public as $$
declare r record; today date := (now() at time zone 'Asia/Kolkata')::date; nxt date; n int := 0; ahead int := greatest(cfg_num('reminderDays', 7), 1)::int;
begin
  for r in select * from reminders where created_at < now() - interval '1 day' loop
    nxt := (r.day + make_interval(years => greatest(extract(year from today)::int - extract(year from r.day)::int, 0)))::date;
    if nxt < today then nxt := (nxt + interval '1 year')::date; end if;
    if nxt - today between 1 and ahead then
      perform tell('reminder', case when r.contact like '%@%' then r.contact end, case when r.contact not like '%@%' then r.contact end,
        'reminder:' || r.id || ':' || nxt, null, jsonb_build_object('occasion', r.occasion, 'for', r.for_name, 'day', nxt), true);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- the notify function takes up to n queued messages to send (with the order and the customer's name), then reports
-- each one back. A failed message is tried again on the next run, up to 5 times; one that can never go (no provider
-- set up for its channel) is given up at once. A message stuck "sending" for 10 minutes goes back in the queue.
create or replace function claim_notes(n int) returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  update notifications set status = 'queued' where status = 'sending' and claimed_at < now() - interval '10 minutes';
  with c as (select id from notifications where status = 'queued' and tries < 5 order by created_at limit least(greatest(n, 1), 50) for update skip locked),
    u as (update notifications t set status = 'sending', tries = t.tries + 1, claimed_at = now() from c where t.id = c.id returning t.*)
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'event', u.event, 'channel', u.channel, 'recipient', u.recipient, 'order_id', u.order_id, 'data', u.data,
      'order', (select o.data || jsonb_build_object('status', o.status) from orders o where o.id = u.order_id),
      'name', coalesce((select nullif(p.name, '') from profiles p where p.email = u.recipient), (select o.data -> 'contact' ->> 'name' from orders o where o.id = u.order_id)))), '[]')
    into res from u;
  return res;
end $$;
create or replace function finish_note(note_id uuid, ok boolean, err text, give_up boolean) returns void language sql security definer set search_path = public as $$
  update notifications set status = case when ok then 'sent' when give_up or tries >= 5 then 'failed' else 'queued' end,
    error = case when ok then null else left(err, 500) end, sent_at = case when ok then now() end
  where id = note_id and status = 'sending';
$$;

-- who may call what: Supabase lets everyone call every function unless told otherwise
revoke execute on function hit(text, text, int, interval) from public, anon, authenticated;
revoke execute on function release_unpaid() from public, anon, authenticated;
revoke execute on function cfg_num(text, numeric) from public, anon, authenticated;
revoke execute on function cfg_on(text, boolean) from public, anon, authenticated;
revoke execute on function cfg_text(text, text) from public, anon, authenticated;
revoke execute on function client_key() from public, anon, authenticated;
revoke execute on function guard_visitor() from public, anon, authenticated;
revoke execute on function place_order(jsonb) from public, anon;
revoke execute on function get_order(text, text) from public;
revoke execute on function cancel_order(text) from public, anon;
revoke execute on function set_delay(text, jsonb) from public, anon;
grant execute on function place_order(jsonb) to authenticated;
revoke execute on function customer_email() from public, anon, authenticated;
revoke execute on function points_of(text) from public, anon, authenticated;
revoke execute on function my_orders() from public, anon;
grant execute on function my_orders() to authenticated;
grant execute on function get_order(text, text) to anon, authenticated;
grant execute on function cancel_order(text) to authenticated;
grant execute on function set_delay(text, jsonb) to authenticated;
grant execute on function is_owner() to anon, authenticated;
revoke execute on function gift_card_balance(text) from public;
revoke execute on function my_referral(text) from public;
grant execute on function gift_card_balance(text) to anon, authenticated;
grant execute on function my_referral(text) to anon, authenticated;
revoke execute on function mark_paid(text, jsonb) from public, anon, authenticated;
revoke execute on function set_shipment(text, jsonb, text) from public, anon, authenticated;
grant execute on function mark_paid(text, jsonb) to service_role;
grant execute on function hit(text, text, int, interval) to service_role; -- the delivery function limits PIN checks per visitor
grant execute on function set_shipment(text, jsonb, text) to service_role;
-- profiles: only the signed-in customer, for their own email; messages: only the notify function
revoke execute on function remember_details(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function my_profile() from public, anon;
revoke execute on function save_profile(jsonb) from public, anon;
revoke execute on function forget_me() from public, anon;
grant execute on function my_profile() to authenticated;
grant execute on function save_profile(jsonb) to authenticated;
grant execute on function forget_me() to authenticated;
revoke execute on function shop_inbox() from public, anon, authenticated;
revoke execute on function queue_note(text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function tell(text, text, text, text, text, jsonb, boolean) from public, anon, authenticated;
revoke execute on function order_notes() from public, anon, authenticated;
revoke execute on function welcome_note() from public, anon, authenticated;
revoke execute on function restock_notes() from public, anon, authenticated;
revoke execute on function queue_reminders() from public, anon, authenticated;
revoke execute on function claim_notes(int) from public, anon, authenticated;
revoke execute on function finish_note(uuid, boolean, text, boolean) from public, anon, authenticated;
grant execute on function queue_reminders() to service_role;
grant execute on function claim_notes(int) to service_role;
grant execute on function finish_note(uuid, boolean, text, boolean) to service_role;

-- ---------- photos and videos ----------
-- only photos and videos, up to 50 MB each (so nothing that runs in a browser, such as HTML or SVG, can be stored)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('media', 'media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
  on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "bt media owner write" on storage.objects;
drop policy if exists "bt media owner update" on storage.objects;
drop policy if exists "bt media owner delete" on storage.objects;
create policy "bt media owner write" on storage.objects for insert to authenticated with check (bucket_id = 'media' and is_owner());
create policy "bt media owner update" on storage.objects for update to authenticated using (bucket_id = 'media' and is_owner());
create policy "bt media owner delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and is_owner());

-- ---------- the owner ----------
-- Replace with the email Ashi signs in with (the same one created in Authentication → Users).
insert into owners (email) values ('hello@budandthings.com') on conflict do nothing;
