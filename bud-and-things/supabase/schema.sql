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
-- discount codes the owner makes and manages in Owner view → Coupons. A customer can't read this table: they check a code
-- with check_coupon() and place_order() works the discount out itself. How often a code was used is counted from the
-- orders that carry it (cancelled ones don't count), so cancelling an order gives its use back.
create table if not exists coupons (
  code text primary key check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,23}$'),
  kind text not null default 'percent' check (kind in ('percent', 'flat')),
  amount int not null check (amount > 0 and (kind = 'flat' or amount <= 100)),
  min_order int not null default 0 check (min_order >= 0),   -- pieces after the ritual saving must reach this (₹)
  max_off int not null default 0 check (max_off >= 0),       -- cap on the discount (₹, 0 for none)
  starts_on date, ends_on date,
  max_uses int not null default 0 check (max_uses >= 0),     -- in total (0 for no limit)
  per_customer int not null default 0 check (per_customer >= 0),
  first_order_only boolean not null default false,
  tag text not null default 'other' check (tag in ('welcome', 'festive', 'birthday', 'thankyou', 'referral', 'other')),
  featured boolean not null default false,                   -- the welcome code the site's banners and messages show
  active boolean not null default true,
  created_at timestamptz not null default now());
-- points the owner gives or takes back by hand (a thank-you, an apology, a mistake): added to what a customer can spend
create table if not exists points_log (id uuid primary key default gen_random_uuid(), email text not null, delta int not null check (delta <> 0 and abs(delta) <= 100000),
  note text not null default '', created_at timestamptz not null default now());
create index if not exists points_log_email on points_log (email);
-- invoices and credit notes. Numbers run one after the other within a financial year (April to March) and are never
-- reused: a cancelled invoice stays here marked Void. Made only by issue_invoice() and void_invoice() below.
create table if not exists invoice_counters (fy text not null, kind text not null, last int not null default 0, primary key (fy, kind));
create table if not exists invoices (
  id text primary key,
  kind text not null default 'invoice' check (kind in ('invoice', 'credit_note')),
  order_id text not null, fy text not null, seq int not null,
  against text,
  status text not null default 'Issued' check (status in ('Issued', 'Void')),
  void_reason text, voided_at timestamptz,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (kind, fy, seq));
create index if not exists invoices_order on invoices (order_id);

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
-- reviews: a tick when the writer bought that piece and it was delivered, the owner's public reply, pinned ("featured")
-- reviews, and where the owner copied one from when added by hand (Instagram, WhatsApp…)
alter table reviews add column if not exists verified boolean not null default false;
alter table reviews add column if not exists reply text;
alter table reviews add column if not exists replied_at timestamptz;
alter table reviews add column if not exists featured boolean not null default false;
alter table reviews add column if not exists source text;
-- who wrote a review (when they were signed in). Kept apart from reviews, which anyone can read once published.
create table if not exists review_authors (review_id uuid primary key references reviews (id) on delete cascade, email text not null, created_at timestamptz not null default now());
create index if not exists review_authors_email on review_authors (email);
-- where a sign-up first came from (instagram, google, a share link…), as the site saw it on their first visit
alter table subscribers add column if not exists came_from text;
-- what the owner keeps about a customer beyond their orders: tags, a private note and a birthday. `contact` is the
-- customer's email, or their 10-digit mobile when there is no email.
create table if not exists customer_meta (contact text primary key, tags text[] not null default '{}', notes text not null default '',
  birthday date, updated_at timestamptz not null default now());
-- what visitors do on the site, for Owner view → Analytics. Anonymous: `vid` is a random id kept in the browser and `sid`
-- one per visit; never a name, email, number or address. Kept for eventDays days (400 unless set).
create table if not exists events (id bigint generated always as identity primary key, name text not null, data jsonb not null default '{}',
  vid text, sid text, page text, src text, created_at timestamptz not null default now());
create index if not exists events_time on events (created_at);

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

-- Mobile numbers are saved one way everywhere: + country code + number (E.164, what WhatsApp, SMS providers and
-- spreadsheets expect), such as +919876543210 or +447911123456. Indian numbers are 10 digits starting 6 to 9 and
-- may be typed as 9876543210, 919876543210 or 09876543210 (no +); a number typed with a + keeps its own country code.
-- Other countries: 7 to 15 digits in all. Anything else gives null.
create or replace function norm_phone(p text) returns text language sql immutable as $$
  select case
    when trim(coalesce(p, '')) like '+%' then
      case when raw ~ '^91' then case when raw ~ '^91[6-9][0-9]{9}$' then '+' || raw end
           when raw ~ '^[1-9][0-9]{6,14}$' then '+' || raw end
    when local ~ '^[6-9][0-9]{9}$' then '+91' || local
  end
  from (select r as raw, regexp_replace(r, '^(91|0)(?=[6-9][0-9]{9}$)', '') as local
        from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') r) y) x
$$;
-- an email (lower case) or a mobile number (+91…); null when it is neither
create or replace function norm_contact(c text) returns text language sql immutable as $$
  select case when lower(trim(coalesce(c, ''))) ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then lower(trim(c)) else norm_phone(c) end
$$;

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

-- the code that was set in Settings before coupons existed becomes the first coupon (once)
insert into coupons (code, kind, amount, tag, featured)
  select upper(trim(cfg_text('welcomeCode', 'HELLO10'))), 'percent', least(greatest(round(cfg_num('welcomeOff', 10))::int, 1), 100), 'welcome', true
  where upper(trim(cfg_text('welcomeCode', 'HELLO10'))) ~ '^[A-Z0-9][A-Z0-9_-]{1,23}$' and cfg_num('welcomeOff', 10) > 0
  on conflict do nothing;

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
alter table coupons enable row level security;
alter table points_log enable row level security;
alter table invoice_counters enable row level security; -- no rules on purpose: only issue_invoice() uses it
alter table invoices enable row level security;
alter table notifications enable row level security;
alter table review_authors enable row level security;
alter table customer_meta enable row level security;
alter table events enable row level security;
alter table hits enable row level security; -- no rules on purpose: only the functions here read or write it
revoke all on hits from anon, authenticated;
revoke all on invoice_counters from anon, authenticated;
revoke insert, update, delete on invoices from anon, authenticated;

-- change history: what each save to site text, settings, products and rituals replaced, so Owner view can put it back
create table if not exists change_log (id bigserial primary key, at timestamptz not null default now(), tbl text not null, key text not null, old jsonb, new jsonb);
alter table change_log enable row level security;
drop policy if exists "owner" on change_log;
create policy "owner" on change_log for all using (is_owner()) with check (is_owner());

do $$
declare t text;
begin
  -- drop and recreate so the file can be run again
  for t in select unnest(array['products','pairings','site_text','settings','stock','media','orders','reviews','subscribers','restock_requests','reminders','gift_cards','referrers','profiles','notifications','owners','coupons','points_log','invoices','review_authors','customer_meta','events']) loop
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
create policy "owner" on coupons for all using (is_owner()) with check (is_owner());
create policy "owner" on points_log for all using (is_owner()) with check (is_owner());
create policy "owner" on invoices for select using (is_owner());
create policy "owner" on notifications for select using (is_owner());
create policy "owner" on review_authors for select using (is_owner());
create policy "owner" on customer_meta for all using (is_owner()) with check (is_owner());
create policy "owner" on events for select using (is_owner());
-- visitors may send a review (held until the owner publishes it), sign up, or ask to hear about a restock
create policy "visitor" on reviews for insert with check (not published and length(name) between 1 and 60 and length(body) between 1 and 1500 and length(product_id) < 60);
create policy "visitor" on subscribers for insert with check (length(contact) between 5 and 120 and length(coalesce(source, '')) <= 40);
create policy "visitor" on restock_requests for insert with check (length(contact) between 5 and 120 and length(sku) < 60);
create policy "visitor" on reminders for insert with check (length(contact) between 5 and 120 and length(occasion) <= 30 and length(coalesce(for_name, '')) <= 60);
create policy "visitor" on events for insert with check (length(name) <= 40 and length(data::text) <= 1000);

-- what a visitor sends is checked, tidied and counted before it is saved
create or replace function guard_visitor() returns trigger language plpgsql security definer set search_path = public as $$
declare me text := client_key();
begin
  if is_owner() then return new; end if;
  new.created_at := now();
  if tg_table_name = 'events' then
    if new.name !~ '^[a-z_]{2,40}$' or jsonb_typeof(new.data) <> 'object' then raise exception 'bad_event'; end if;
    new.vid := case when new.vid ~ '^[a-z0-9]{6,40}$' then new.vid end; new.sid := case when new.sid ~ '^[a-z0-9]{6,40}$' then new.sid end;
    new.page := left(new.page, 80); new.src := case when new.src ~ '^[a-z0-9._-]{1,40}$' then new.src end;
    perform hit('event', me, 600, '1 hour'); perform hit('event', 'site', 30000, '1 hour');
    if random() < 0.001 then delete from events where created_at < now() - make_interval(days => greatest(cfg_num('eventDays', 400), 30)::int); end if;
  elsif tg_table_name = 'reviews' then
    new.id := gen_random_uuid(); new.published := false; new.name := trim(new.name); new.body := trim(new.body);
    new.verified := false; new.reply := null; new.replied_at := null; new.featured := false; new.source := 'site';
    if not exists (select 1 from products where id = new.product_id and live) then raise exception 'unknown_item'; end if;
    -- signed in: one review per piece, and "Verified buyer" when one of their delivered orders had it
    if customer_email() is not null then
      if exists (select 1 from review_authors a join reviews r on r.id = a.review_id where a.email = customer_email() and r.product_id = new.product_id) then raise exception 'already_reviewed'; end if;
      new.verified := exists (select 1 from orders o, jsonb_array_elements(o.data -> 'items') i, products p, jsonb_array_elements(p.data -> 'variants') v
        where o.data ->> 'email' = customer_email() and o.status = 'Delivered' and p.id = new.product_id and v ->> 'sku' = i ->> 'sku');
    end if;
    perform hit('review', me, 3, '1 hour'); perform hit('review', 'site', 60, '1 hour');
  elsif tg_table_name = 'subscribers' then
    new.id := gen_random_uuid(); new.contact := norm_contact(new.contact);
    if new.contact is null then raise exception 'bad_contact'; end if;
    if new.source is not null and new.source !~ '^[a-z0-9-]{1,40}$' then raise exception 'bad_source'; end if;
    new.came_from := case when new.came_from ~ '^[a-z0-9._-]{1,40}$' then new.came_from end;
    perform hit('signup', me, 5, '1 hour'); perform hit('signup', 'site', 300, '1 hour');
    if exists (select 1 from subscribers where contact = new.contact) then return null; end if; -- already signed up
  elsif tg_table_name = 'restock_requests' then
    new.id := gen_random_uuid(); new.contact := norm_contact(new.contact);
    if new.contact is null then raise exception 'bad_contact'; end if;
    if not exists (select 1 from products p, jsonb_array_elements(p.data -> 'variants') v where p.live and v ->> 'sku' = new.sku) then raise exception 'unknown_item'; end if;
    perform hit('restock', me, 10, '1 hour'); perform hit('restock', 'site', 300, '1 hour');
    if exists (select 1 from restock_requests where sku = new.sku and contact = new.contact) then return null; end if;
  elsif tg_table_name = 'reminders' then
    new.id := gen_random_uuid(); new.contact := norm_contact(new.contact); new.for_name := nullif(trim(coalesce(new.for_name, '')), '');
    if new.contact is null then raise exception 'bad_contact'; end if;
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
drop trigger if exists guard_visitor on events;
create trigger guard_visitor before insert on events for each row execute function guard_visitor();

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
      - coalesce(sum(case when status <> 'Cancelled' then coalesce((data ->> 'pointsUsed')::int, 0) else 0 end), 0)
      + coalesce((select sum(delta) from points_log where email = em), 0))::int,
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

-- what a code takes off `base` rupees (the pieces after the ritual saving) for this customer, or an exception that says
-- why not: bad_code, coupon_early, coupon_ended, coupon_used_up, coupon_min:<₹>, coupon_first, coupon_per_customer.
-- With lock_row the coupon row is held until the order is saved, so the last use can't be taken twice.
create or replace function coupon_off(code_in text, base int, em text, lock_row boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare c coupons%rowtype; today date := (now() at time zone 'Asia/Kolkata')::date; off int;
begin
  code_in := upper(trim(coalesce(code_in, '')));
  if lock_row then select * into c from coupons where code = code_in for update; else select * into c from coupons where code = code_in; end if;
  if c.code is null or not c.active then raise exception 'bad_code'; end if;
  if c.starts_on is not null and today < c.starts_on then raise exception 'coupon_early'; end if;
  if c.ends_on is not null and today > c.ends_on then raise exception 'coupon_ended'; end if;
  if c.max_uses > 0 and (select count(*) from orders where data ->> 'code' = c.code and status <> 'Cancelled') >= c.max_uses then raise exception 'coupon_used_up'; end if;
  if base < c.min_order then raise exception 'coupon_min:%', c.min_order; end if;
  if em is not null then
    if c.first_order_only and exists (select 1 from orders where data ->> 'email' = em and status <> 'Cancelled') then raise exception 'coupon_first'; end if;
    if c.per_customer > 0 and (select count(*) from orders where data ->> 'email' = em and data ->> 'code' = c.code and status <> 'Cancelled') >= c.per_customer then raise exception 'coupon_per_customer'; end if;
  end if;
  off := case c.kind when 'percent' then round(base * c.amount / 100.0) else least(c.amount, base) end;
  if c.max_off > 0 then off := least(off, c.max_off); end if;
  return jsonb_build_object('code', c.code, 'kind', c.kind, 'amount', c.amount, 'min_order', c.min_order, 'max_off', c.max_off, 'off', off);
end $$;
-- the checkout asks whether a code works for this cart (20 tries an hour per connection, so codes can't be guessed)
create or replace function check_coupon(code_in text, base int) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform hit('coupon', client_key(), 20, '1 hour');
  return coupon_off(code_in, base, customer_email(), false);
end $$;

create or replace function place_order(o jsonb) returns text language plpgsql security definer set search_path = public as $$
declare
  c jsonb := coalesce(o -> 'contact', '{}'); a jsonb := coalesce(o -> 'address', '{}'); g jsonb := o -> 'gift';
  method text := o ->> 'method'; phone text := norm_phone(c ->> 'phone');
  it jsonb; n int; pieces int := 0; price int; cat text; pname text; plabel text;
  items jsonb := '[]'; skus text[] := '{}'; candles int[] := '{}'; objects int[] := '{}';
  sub int := 0; ritual int := 0; code_off int := 0; ship int := 0; wrap int := 0; cod int := 0; total int; code text := '';
  gift_on boolean := false; gift jsonb := null; new_id text; st text;
  em text := customer_email(); use_pts int := 0; earned int := 0;
  card text := upper(trim(coalesce(o ->> 'card', ''))); card_off int := 0; bal int; ref text := null; cpn jsonb;
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
  if phone is null then raise exception 'bad_order:phone'; end if;
  if length(coalesce(a ->> 'line1', '')) not between 1 and 200 or length(coalesce(a ->> 'line2', '')) > 200 then raise exception 'bad_order:address'; end if;
  if coalesce(a ->> 'pin', '') !~ '^[1-9][0-9]{5}$' then raise exception 'bad_order:pin'; end if;
  if length(coalesce(a ->> 'city', '')) not between 1 and 80 or length(coalesce(a ->> 'state', '')) not between 1 and 60 then raise exception 'bad_order:address'; end if;
  -- Online: paid through Razorpay (functions/pay). Gift card or points: only when they cover the whole total.
  if method is null or method not in ('Online', 'UPI QR', 'Gift card or points', 'Cash on delivery') then raise exception 'bad_order:method'; end if;
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
    cpn := coupon_off(o ->> 'code', sub - ritual, em, true);
    code := cpn ->> 'code'; code_off := (cpn ->> 'off')::int;
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
    'gift', gift, 'optin', coalesce(o ->> 'optin', 'false') = 'true', 'card', nullif(card, ''), 'cardOff', card_off, 'ref', ref,
    'src', case when o ->> 'src' ~ '^[a-z0-9._-]{1,40}$' then o ->> 'src' end), st, phone, total, method);
  perform remember_details(em, trim(c ->> 'name'), phone, case when gift_on then null else a end);
  return new_id;
end $$;

-- a customer can look up their own order with its number and their phone number (20 tries an hour per connection)
drop function if exists get_order(text, text);
create function get_order(order_id text, phone_no text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform hit('lookup', client_key(), 20, '1 hour');
  return (select data || jsonb_build_object('status', status) from orders where id = upper(trim(order_id)) and phone = norm_phone(phone_no));
end $$;

-- A customer who paid by UPI QR sends the bank's reference (UTR) for their order, so the owner can find the payment fast.
-- It only notes the reference. The order moves on when the owner checks the bank and presses Mark paid.
create or replace function note_payment(order_id text, phone_no text, utr text) returns void language plpgsql security definer set search_path = public as $$
declare ref text := upper(trim(coalesce(utr, '')));
begin
  perform hit('utr', client_key(), 10, '1 hour');
  if ref !~ '^[A-Z0-9]{8,22}$' then raise exception 'bad_utr'; end if;
  update orders set data = data || jsonb_build_object('utr', ref, 'utrAt', now())
    where id = upper(trim(order_id)) and phone = norm_phone(phone_no) and method = 'UPI QR' and status = 'Awaiting payment';
  if not found then raise exception 'not_found'; end if;
end $$;

-- the customer's own invoice for an order: the order number and the mobile number on it, as for get_order
create or replace function get_invoice(order_id text, phone_no text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform hit('lookup', client_key(), 20, '1 hour');
  return (select to_jsonb(i) from invoices i join orders o on o.id = i.order_id
    where o.id = upper(trim(get_invoice.order_id)) and o.phone = norm_phone(phone_no) and i.kind = 'invoice' and i.status = 'Issued' order by i.created_at desc limit 1);
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

-- ---------- online payment (Razorpay) and delivery (Shiprocket) ----------
-- Only the pay and delivery functions (supabase/functions) call these, with the service key; visitors and the owner can't.

-- Razorpay confirmed the payment. Usually the order is still waiting, and moves on to Placed. If it was paid after its
-- hold ran out (and was cancelled), the pieces and gift card balance are taken again when they're still there;
-- otherwise it stays cancelled and is marked refundDue so the owner refunds it in the Razorpay dashboard.
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

-- ---------- invoices ----------
-- An invoice is made automatically when an order is paid (Placed) unless the owner turned that off in Settings
-- (invoiceAuto), and by hand from Owner view with "Make invoice". Either way the lines and tax are worked out here from the
-- order and the GST settings, and the number and date are given in one step, so numbers can't skip or repeat.
-- Numbers look like BT/26-27/0001 (credit notes BTCN/26-27/0001): at most 16 characters, restarting each 1 April.
-- A cancelled order that had an invoice gets a credit note automatically.
create or replace function invoice_snapshot(oid text) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ord orders%rowtype; d jsonb; it jsonb; a jsonb; c jsonb;
  gst boolean := cfg_on('gstOn', false); home text := coalesce(cfg_text('gstState', ''), ''); inter boolean := false;
  cat text; hk text; rk text; hsn text; rate numeric; top numeric := 0;
  names text[] := '{}'; qtys int[] := '{}'; hsns text[] := '{}'; rates numeric[] := '{}'; gross bigint[] := '{}'; disc bigint[] := '{}';
  n int; i int; gsum bigint := 0; disc_all bigint; left_ bigint; net bigint; tax bigint; taxable bigint; cg bigint; sg bigint; ig bigint;
  lines jsonb := '[]'; t_tax bigint := 0; t_cg bigint := 0; t_sg bigint := 0; t_ig bigint := 0; t_total bigint := 0; ch record;
begin
  select * into ord from orders where id = oid;
  if ord.id is null then raise exception 'not_found'; end if;
  d := ord.data; a := coalesce(d -> 'address', '{}'); c := coalesce(d -> 'contact', '{}');
  if gst then
    if upper(trim(cfg_text('gstin', ''))) !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then raise exception 'invoice_setup:gstin'; end if;
    if home = '' then raise exception 'invoice_setup:state'; end if;
    if trim(cfg_text('bizName', '')) = '' or trim(cfg_text('bizAddress', '')) = '' then raise exception 'invoice_setup:business'; end if;
    inter := coalesce(a ->> 'state', '') <> '' and (a ->> 'state') <> home;
  end if;
  for it in select * from jsonb_array_elements(d -> 'items') loop
    select p.data ->> 'cat' into cat from products p, jsonb_array_elements(p.data -> 'variants') v where v ->> 'sku' = it ->> 'sku' limit 1;
    hk := case coalesce(cat, 'jesmonite') when 'candles' then 'hsnCandles' when 'gifts' then 'hsnGifts' else 'hsnObjects' end;
    rk := case coalesce(cat, 'jesmonite') when 'candles' then 'gstCandles' when 'gifts' then 'gstGifts' else 'gstObjects' end;
    hsn := case when gst then trim(cfg_text(hk, '')) else '' end; rate := case when gst then cfg_num(rk, 18) else 0 end;
    if gst and hsn = '' then raise exception 'invoice_setup:hsn:%', hk; end if;
    names := array_append(names, (it ->> 'name') || case when coalesce(it ->> 'label', '') <> '' then ' · ' || (it ->> 'label') else '' end);
    qtys := array_append(qtys, (it ->> 'qty')::int); hsns := array_append(hsns, hsn); rates := array_append(rates, rate); gross := array_append(gross, (it ->> 'price')::bigint * (it ->> 'qty')::bigint * 100); disc := array_append(disc, 0::bigint);
    top := greatest(top, rate);
  end loop;
  n := coalesce(array_length(names, 1), 0);
  if n = 0 then raise exception 'bad_invoice'; end if;
  -- the ritual saving, coupon and Bud Points come off the price of the pieces, shared in proportion to their price
  for i in 1 .. n loop gsum := gsum + gross[i]; end loop;
  disc_all := round((coalesce((d ->> 'ritual')::numeric, 0) + coalesce((d ->> 'codeOff')::numeric, 0) + coalesce((d ->> 'pointsUsed')::numeric, 0)) * 100)::bigint; left_ := disc_all;
  for i in 1 .. n loop
    disc[i] := case when i = n then left_ else least(left_, floor(disc_all::numeric * gross[i] / greatest(gsum, 1))::bigint) end; left_ := left_ - disc[i];
  end loop;
  for ch in select * from (values (1, 'Shipping', coalesce((d ->> 'ship')::numeric, 0)), (2, 'Gift wrap', coalesce((d ->> 'wrap')::numeric, 0)), (3, 'Cash on delivery fee', coalesce((d ->> 'cod')::numeric, 0))) x(k, nm, v) where v > 0 order by k loop
    names := array_append(names, ch.nm); qtys := array_append(qtys, 1); hsns := array_append(hsns, ''::text); rates := array_append(rates, case when gst then top else 0::numeric end); gross := array_append(gross, round(ch.v * 100)::bigint); disc := array_append(disc, 0::bigint);
  end loop;
  n := array_length(names, 1);
  for i in 1 .. n loop
    net := gross[i] - disc[i]; cg := 0; sg := 0; ig := 0;
    if gst then
      taxable := round(net * 100 / (100 + rates[i]))::bigint; tax := net - taxable;
      if inter then ig := tax; else cg := round(tax / 2.0)::bigint; sg := tax - cg; end if;
    else taxable := net; end if;
    t_tax := t_tax + taxable; t_cg := t_cg + cg; t_sg := t_sg + sg; t_ig := t_ig + ig; t_total := t_total + net;
    lines := lines || jsonb_build_object('name', names[i], 'qty', qtys[i], 'hsn', hsns[i], 'rate', rates[i], 'gross', gross[i], 'disc', disc[i], 'net', net, 'taxable', taxable, 'cgst', cg, 'sgst', sg, 'igst', ig);
  end loop;
  return jsonb_build_object('gst', gst, 'inter', inter, 'placeOfSupply', coalesce(a ->> 'state', ''), 'orderId', ord.id, 'orderDate', d ->> 'placedAt', 'method', d ->> 'method', 'lines', lines,
    'totals', jsonb_build_object('discount', disc_all, 'taxable', t_tax, 'cgst', t_cg, 'sgst', t_sg, 'igst', t_ig, 'total', t_total),
    'seller', jsonb_build_object('name', coalesce(nullif(trim(cfg_text('bizName', '')), ''), 'BUD & THINGS'),
      'address', case when trim(cfg_text('bizAddress', '')) <> '' then trim(cfg_text('bizAddress', '')) || ', India' else '' end,
      'gstin', case when gst then upper(trim(cfg_text('gstin', ''))) else '' end, 'email', cfg_text('email', 'hello@budandthings.com')),
    'buyer', jsonb_build_object('name', coalesce(c ->> 'name', ''), 'phone', coalesce(c ->> 'phone', ''), 'email', coalesce(c ->> 'email', ''), 'line1', coalesce(a ->> 'line1', ''), 'line2', coalesce(a ->> 'line2', ''),
      'city', coalesce(a ->> 'city', ''), 'pin', coalesce(a ->> 'pin', ''), 'state', coalesce(a ->> 'state', '')));
end $$;

-- makes the invoice (or credit note); no owner check, so the trigger below can use it. Owner view calls issue_invoice().
create or replace function make_invoice(order_id_in text, kind_in text, against_in text, reason_in text) returns jsonb language plpgsql security definer set search_path = public as $$
declare ord record; orig invoices%rowtype; inv invoices%rowtype; fyr text; yy int; n int; num text; snap jsonb; today date := (now() at time zone 'Asia/Kolkata')::date;
  pre text := left(upper(regexp_replace(coalesce(nullif(trim(cfg_text('invoicePrefix', 'BT')), ''), 'BT'), '[^A-Za-z0-9]', '', 'g')), 3);
begin
  if kind_in not in ('invoice', 'credit_note') then raise exception 'bad_invoice'; end if;
  if pre = '' then pre := 'BT'; end if;
  select id, status into ord from orders where id = order_id_in for update;
  if ord.id is null then raise exception 'not_found'; end if;
  if kind_in = 'invoice' then
    if ord.status in ('Awaiting payment', 'Cancelled') then raise exception 'not_ready'; end if;
    if exists (select 1 from invoices where order_id = order_id_in and kind = 'invoice' and status = 'Issued') then raise exception 'already_invoiced'; end if;
  else
    select * into orig from invoices where id = against_in and kind = 'invoice' and status = 'Issued' for update;
    if orig.id is null then raise exception 'no_invoice'; end if;
    if length(coalesce(reason_in, '')) not between 1 and 200 then raise exception 'bad_invoice'; end if;
    if exists (select 1 from invoices where against = against_in and kind = 'credit_note' and status = 'Issued') then raise exception 'already_credited'; end if;
  end if;
  snap := invoice_snapshot(order_id_in);
  if kind_in = 'credit_note' then snap := snap || jsonb_build_object('reason', trim(reason_in), 'against', against_in); end if;
  yy := case when extract(month from today) >= 4 then extract(year from today)::int else extract(year from today)::int - 1 end;
  fyr := lpad((yy % 100)::text, 2, '0') || '-' || lpad(((yy + 1) % 100)::text, 2, '0');
  insert into invoice_counters (fy, kind, last) values (fyr, kind_in, 1) on conflict on constraint invoice_counters_pkey do update set last = invoice_counters.last + 1 returning last into n;
  num := case kind_in when 'invoice' then pre || '/' || fyr || '/' || lpad(n::text, 4, '0') else pre || 'CN/' || fyr || '/' || lpad(n::text, 4, '0') end;
  if length(num) > 16 then raise exception 'bad_invoice'; end if;
  insert into invoices (id, kind, order_id, fy, seq, against, data) values (num, kind_in, order_id_in, fyr, n, case when kind_in = 'credit_note' then against_in end,
    snap || jsonb_build_object('number', num, 'date', today)) returning * into inv;
  return to_jsonb(inv);
end $$;
-- Owner view: Make invoice, or Credit note (the reason travels in snap). The browser's own copy of the lines is ignored.
create or replace function issue_invoice(order_id_in text, kind_in text, against_in text, snap jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'not_allowed'; end if;
  return make_invoice(order_id_in, kind_in, against_in, coalesce(snap ->> 'reason', ''));
end $$;
-- an order that is paid gets its invoice; a cancelled one that had an invoice gets a credit note. A problem here (such as GST
-- switched on with no HSN code yet) never stops the order: the owner makes the invoice by hand after fixing it.
create or replace function auto_invoice() returns trigger language plpgsql security definer set search_path = public as $$
declare inv_id text;
begin
  if not cfg_on('invoiceAuto', true) then return new; end if;
  begin
    if new.status in ('Placed', 'Packed', 'Shipped', 'Delivered') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
      if not exists (select 1 from invoices where order_id = new.id and kind = 'invoice') then perform make_invoice(new.id, 'invoice', null, null); end if;
    elsif new.status = 'Cancelled' and tg_op = 'UPDATE' and old.status is distinct from new.status then
      select id into inv_id from invoices where order_id = new.id and kind = 'invoice' and status = 'Issued';
      if inv_id is not null then perform make_invoice(new.id, 'credit_note', inv_id, 'Order cancelled'); end if;
    end if;
  exception when others then
    raise warning 'automatic invoice for % skipped: %', new.id, sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists auto_invoice on orders;
create trigger auto_invoice after insert or update on orders for each row execute function auto_invoice();
-- cancelling an invoice keeps it on record, marked Void with the reason. An invoice that already has a credit note stays as it is.
create or replace function void_invoice(inv_id text, reason text) returns jsonb language plpgsql security definer set search_path = public as $$
declare inv invoices%rowtype;
begin
  if not is_owner() then raise exception 'not_allowed'; end if;
  if length(coalesce(reason, '')) not between 1 and 200 then raise exception 'bad_invoice'; end if;
  select * into inv from invoices where id = inv_id for update;
  if inv.id is null or inv.status <> 'Issued' then raise exception 'not_found'; end if;
  if inv.kind = 'invoice' and exists (select 1 from invoices where against = inv.id and kind = 'credit_note' and status = 'Issued') then raise exception 'has_credit_note'; end if;
  update invoices set status = 'Void', void_reason = trim(reason), voided_at = now() where id = inv_id returning * into inv;
  return to_jsonb(inv);
end $$;

-- a shopper checks a gift card before using it (20 tries an hour per connection, so codes can't be guessed)
create or replace function gift_card_balance(card_code text) returns int language plpgsql security definer set search_path = public as $$
begin
  perform hit('card', client_key(), 20, '1 hour');
  return (select balance from gift_cards where code = upper(trim(card_code)));
end $$;

-- a customer asks for their share link; the same mobile or email always gets the same link
create or replace function my_referral(contact_in text) returns text language plpgsql security definer set search_path = public as $$
declare who text := norm_contact(contact_in); rid text;
begin
  perform hit('referral', client_key(), 5, '1 hour');
  if who is null then raise exception 'bad_contact'; end if;
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
  insert into profiles (email, name, phone, addresses) values (em, coalesce(nm, ''), coalesce(norm_phone(ph), ''), case when addr is null then '[]' else jsonb_build_array(clean_address(addr)) end)
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
  if coalesce(p ->> 'phone', '') <> '' and norm_phone(p ->> 'phone') is null then raise exception 'bad_profile:phone'; end if;
  if jsonb_typeof(coalesce(p -> 'addresses', '[]')) <> 'array' or jsonb_array_length(coalesce(p -> 'addresses', '[]')) > 5 then raise exception 'bad_profile:address'; end if;
  for a in select * from jsonb_array_elements(coalesce(p -> 'addresses', '[]')) loop
    if not ok_address(a) then raise exception 'bad_profile:address'; end if;
    addrs := addrs || jsonb_build_array(clean_address(a));
  end loop;
  if jsonb_typeof(pf) <> 'object' then raise exception 'bad_profile:prefs'; end if;
  for k in select jsonb_object_keys(pf) loop
    if k not in ('whatsapp', 'sms', 'push') or jsonb_typeof(pf -> k) <> 'boolean' then raise exception 'bad_profile:prefs'; end if;
  end loop;
  insert into profiles (email, name, phone, addresses, prefs) values (em, trim(coalesce(p ->> 'name', '')), coalesce(norm_phone(p ->> 'phone'), ''), addrs, pf)
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

-- "Download my data": everything the shop holds under the signed-in customer's email, as one JSON file. The owner's private
-- notes and tags about a customer (customer_meta) and the messages queue are not included.
create or replace function export_my_data() returns jsonb language plpgsql security definer set search_path = public as $$
declare em text := customer_email();
begin
  if em is null then raise exception 'sign_in'; end if;
  perform hit('export', em, 5, '1 hour');
  return jsonb_build_object(
    'email', em, 'exported_at', now(),
    'profile', (select to_jsonb(p) - 'email' from profiles p where p.email = em),
    'orders', coalesce((select jsonb_agg(o.data || jsonb_build_object('status', o.status, 'placed_at', o.created_at) order by o.created_at) from orders o where o.data ->> 'email' = em), '[]'::jsonb),
    'bud_points_adjustments', coalesce((select jsonb_agg(jsonb_build_object('points', l.delta, 'note', l.note, 'at', l.created_at) order by l.created_at) from points_log l where l.email = em), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('product', r.product_id, 'name', r.name, 'rating', r.rating, 'body', r.body, 'published', r.published, 'at', r.created_at) order by r.created_at) from reviews r join review_authors a on a.review_id = r.id where a.email = em), '[]'::jsonb),
    'sign_ups', coalesce((select jsonb_agg(jsonb_build_object('source', s.source, 'at', s.created_at) order by s.created_at) from subscribers s where lower(s.contact) = em), '[]'::jsonb),
    'restock_requests', coalesce((select jsonb_agg(jsonb_build_object('sku', q.sku, 'at', q.created_at) order by q.created_at) from restock_requests q where lower(q.contact) = em), '[]'::jsonb),
    'gift_reminders', coalesce((select jsonb_agg(jsonb_build_object('occasion', d.occasion, 'for', d.for_name, 'day', d.day) order by d.day) from reminders d where lower(d.contact) = em), '[]'::jsonb));
end $$;

-- ---------- messages to customers and the owner ----------
-- The database queues a message when something happens; the notify function sends it (supabase/functions/notify).
--   welcome      a customer's first sign-in (not for customers who ordered before profiles existed)
--   confirmed    an order is Placed: paid online, a gift card or points, or cash on delivery (and new_order to the owner, by email and, if ownerWhatsappOn is set, on WhatsApp)
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
  if norm_phone(ph) is not null then
    if cfg_on('whatsappOn', false) and (asked or coalesce((pf ->> 'whatsapp')::boolean, false)) then perform queue_note(ev, 'whatsapp', norm_phone(ph), rf, oid, d); end if;
    if cfg_on('smsOn', false) and (coalesce((pf ->> 'sms')::boolean, false) or (asked and em is null and not cfg_on('whatsappOn', false))) then perform queue_note(ev, 'sms', norm_phone(ph), rf, oid, d); end if;
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
  -- the owner can also be told on WhatsApp (Settings → ownerWhatsappOn), at the shop WhatsApp number; sent only once a provider is set up
  if ev = 'confirmed' and cfg_on('ownerWhatsappOn', false) and norm_phone(cfg_text('whatsapp', '')) is not null then
    perform queue_note('new_order', 'whatsapp', norm_phone(cfg_text('whatsapp', '')), new.id || ':new_order', new.id, '{}');
  end if;
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

-- a review comes in: remember who wrote it (when signed in), and tell the owner straight away about a 1 or 2 star one,
-- so it can be put right privately
create or replace function review_in() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if customer_email() is not null and not is_owner() then insert into review_authors (review_id, email) values (new.id, customer_email()) on conflict do nothing; end if;
  if new.rating <= 2 and not new.published then
    perform queue_note('low_review', 'email', shop_inbox(), 'low_review:' || new.id, null, jsonb_build_object('product', new.product_id, 'name', new.name, 'rating', new.rating, 'body', left(new.body, 500)));
  end if;
  return new;
end $$;
drop trigger if exists review_in on reviews;
create trigger review_in after insert on reviews for each row execute function review_in();
-- a review is published: thank its writer with reviewPoints Bud Points (0, the default, for none), once per review
create or replace function review_reward() returns trigger language plpgsql security definer set search_path = public as $$
declare em text := (select email from review_authors where review_id = new.id); n int := greatest(cfg_num('reviewPoints', 0), 0)::int;
begin
  if new.published and not old.published and em is not null and n > 0 and not exists (select 1 from points_log where note = 'Review ' || new.id) then
    insert into points_log (email, delta, note) values (em, least(n, 1000), 'Review ' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists review_reward on reviews;
create trigger review_reward after update of published on reviews for each row execute function review_reward();

-- Owner view → Sign-ups → a customer → Delete: everything kept about them goes (sign-ups, reminders, restock requests,
-- notes, saved details, share link, review authorship). Their orders and invoices stay: they are the shop's records.
create or replace function forget_customer(contacts text[]) returns void language plpgsql security definer set search_path = public as $$
declare c text[] := (select array_agg(coalesce(norm_contact(x), lower(trim(x)))) from unnest(contacts) x);
begin
  if not is_owner() then raise exception 'not_allowed'; end if;
  delete from subscribers where contact = any (c);
  delete from restock_requests where contact = any (c);
  delete from reminders where contact = any (c);
  delete from customer_meta where contact = any (c);
  delete from referrers where contact = any (c);
  delete from review_authors where email = any (c);
  update profiles set name = '', phone = '', addresses = '[]', prefs = '{}', updated_at = now() where email = any (c);
end $$;

-- Owner view → Analytics: what visitors did over the last `days` days, added up here so the page never has to download
-- every event. Orders, revenue and customers are worked out on the page from the orders themselves.
create or replace function event_stats(days int) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => least(greatest(days, 1), 400)); res jsonb;
begin
  if not is_owner() then raise exception 'not_allowed'; end if;
  with e as (select * from events where created_at >= since),
    s as (select sid, min(src) src, bool_or(name = 'product_view') viewed, bool_or(name in ('add_to_cart', 'ritual_add', 'combo_add')) added,
      bool_or(name = 'checkout_start') checkout, bool_or(name = 'purchase') bought from e where sid is not null group by sid)
  select jsonb_build_object(
    'visitors', (select count(distinct vid) from e), 'sessions', (select count(*) from s),
    'funnel', (select jsonb_build_object('visits', count(*), 'viewed', count(*) filter (where viewed), 'added', count(*) filter (where added),
      'checkout', count(*) filter (where checkout), 'bought', count(*) filter (where bought)) from s),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'visitors', v, 'sessions', n) order by d) from (
      select (created_at at time zone 'Asia/Kolkata')::date d, count(distinct vid) v, count(distinct sid) n from e group by 1) x), '[]'),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('src', src, 'sessions', n, 'bought', b) order by n desc) from (
      select coalesce(src, 'direct') src, count(*) n, count(*) filter (where bought) b from s group by 1) x), '[]'),
    'names', coalesce((select jsonb_object_agg(name, n) from (select name, count(*) n from e group by name) x), '{}'),
    'views', coalesce((select jsonb_object_agg(k, n) from (select data ->> 'id' k, count(*) n from e where name = 'product_view' and data ? 'id' group by 1) x), '{}'),
    'adds', coalesce((select jsonb_object_agg(k, n) from (select data ->> 'sku' k, count(*) n from e where name = 'add_to_cart' and data ? 'sku' group by 1) x), '{}'),
    'pages', coalesce((select jsonb_object_agg(k, n) from (select coalesce(nullif(page, ''), 'home') k, count(*) n from e where name = 'page_view' group by 1 order by 2 desc limit 30) x), '{}'),
    'detail', coalesce((select jsonb_object_agg(name, v) from (select name, jsonb_agg(jsonb_build_object('data', data, 'n', n) order by n desc) v from (
      select name, data, count(*) n, row_number() over (partition by name order by count(*) desc) r from e
      where name in ('wa_click', 'finder_complete', 'filter', 'house_focus', 'house_mood', 'walk_skip', 'walk_shop', 'share', 'pin_check', 'payment_failed', 'search', 'search_no_results')
      group by name, data) y where r <= 10 group by name) x), '{}'))
  into res;
  return res;
end $$;

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
  -- reviewAskDays (7 unless set; 0 for never) after an order was delivered, ask for a review, unless they wrote one
  if cfg_num('reviewAskDays', 7) > 0 then
    for r in select d.order_id, d.recipient from notifications d where d.event = 'delivered' and d.channel = 'email' and d.status = 'sent'
        and d.created_at between now() - make_interval(days => cfg_num('reviewAskDays', 7)::int + 7) and now() - make_interval(days => cfg_num('reviewAskDays', 7)::int)
        and not exists (select 1 from review_authors a where a.email = d.recipient and a.created_at > d.created_at) loop
      perform queue_note('review_ask', 'email', r.recipient, r.order_id || ':review_ask', r.order_id, jsonb_build_object('product', (select p.id from orders o, products p, jsonb_array_elements(p.data -> 'variants') v
        where o.id = r.order_id and v ->> 'sku' = o.data -> 'items' -> 0 ->> 'sku' limit 1))); n := n + 1;
    end loop;
  end if;
  -- every Monday, a summary of the past week to the shop's inbox (setting weeklySummary, on unless switched off)
  if cfg_on('weeklySummary', true) and extract(isodow from today) = 1 then
    perform queue_note('weekly', 'email', shop_inbox(), 'weekly:' || today, null, jsonb_build_object(
      'orders', (select count(*) from orders where created_at >= now() - interval '7 days' and status not in ('Cancelled', 'Awaiting payment')),
      'revenue', (select coalesce(sum(total), 0) from orders where created_at >= now() - interval '7 days' and status not in ('Cancelled', 'Awaiting payment')),
      'visitors', (select count(distinct vid) from events where created_at >= now() - interval '7 days'),
      'signups', (select count(*) from subscribers where created_at >= now() - interval '7 days'),
      'reviews', (select count(*) from reviews where not published),
      'lowStock', (select count(*) from stock where qty between 1 and 2)));
  end if;
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
revoke execute on function note_payment(text, text, text) from public;
revoke execute on function get_invoice(text, text) from public;
revoke execute on function cancel_order(text) from public, anon;
revoke execute on function set_delay(text, jsonb) from public, anon;
revoke execute on function coupon_off(text, int, text, boolean) from public, anon, authenticated;
revoke execute on function check_coupon(text, int) from public;
revoke execute on function issue_invoice(text, text, text, jsonb) from public, anon;
revoke execute on function invoice_snapshot(text) from public, anon, authenticated;
revoke execute on function make_invoice(text, text, text, text) from public, anon, authenticated;
revoke execute on function auto_invoice() from public, anon, authenticated;
revoke execute on function void_invoice(text, text) from public, anon;
grant execute on function place_order(jsonb) to authenticated;
revoke execute on function customer_email() from public, anon, authenticated;
revoke execute on function points_of(text) from public, anon, authenticated;
revoke execute on function my_orders() from public, anon;
grant execute on function my_orders() to authenticated;
grant execute on function get_order(text, text) to anon, authenticated;
grant execute on function note_payment(text, text, text) to anon, authenticated;
grant execute on function get_invoice(text, text) to anon, authenticated;
grant execute on function cancel_order(text) to authenticated;
grant execute on function set_delay(text, jsonb) to authenticated;
grant execute on function check_coupon(text, int) to anon, authenticated;
grant execute on function issue_invoice(text, text, text, jsonb) to authenticated;
grant execute on function void_invoice(text, text) to authenticated;
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
revoke execute on function export_my_data() from public, anon;
grant execute on function my_profile() to authenticated;
grant execute on function save_profile(jsonb) to authenticated;
grant execute on function forget_me() to authenticated;
grant execute on function export_my_data() to authenticated;
revoke execute on function shop_inbox() from public, anon, authenticated;
revoke execute on function queue_note(text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function tell(text, text, text, text, text, jsonb, boolean) from public, anon, authenticated;
revoke execute on function order_notes() from public, anon, authenticated;
revoke execute on function welcome_note() from public, anon, authenticated;
revoke execute on function restock_notes() from public, anon, authenticated;
revoke execute on function queue_reminders() from public, anon, authenticated;
revoke execute on function claim_notes(int) from public, anon, authenticated;
revoke execute on function finish_note(uuid, boolean, text, boolean) from public, anon, authenticated;
revoke execute on function review_in() from public, anon, authenticated;
revoke execute on function review_reward() from public, anon, authenticated;
revoke execute on function forget_customer(text[]) from public, anon;
revoke execute on function event_stats(int) from public, anon;
grant execute on function forget_customer(text[]) to authenticated;
grant execute on function event_stats(int) to authenticated;
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

-- ---------- mobile numbers saved before +91 was added ----------
-- Safe to repeat: a number already in +91 form stays as it is.
update orders set phone = norm_phone(phone) where phone ~ '^[6-9][0-9]{9}$' or phone ~ '^(91|0)[6-9][0-9]{9}$';
update orders set data = jsonb_set(data, '{contact,phone}', to_jsonb(norm_phone(data -> 'contact' ->> 'phone'))) where norm_phone(data -> 'contact' ->> 'phone') is not null and data -> 'contact' ->> 'phone' <> norm_phone(data -> 'contact' ->> 'phone');
update orders set data = jsonb_set(data, '{gift,phone}', to_jsonb(norm_phone(data -> 'gift' ->> 'phone'))) where norm_phone(data -> 'gift' ->> 'phone') is not null and data -> 'gift' ->> 'phone' <> norm_phone(data -> 'gift' ->> 'phone');
update profiles set phone = norm_phone(phone) where norm_phone(phone) is not null and phone <> norm_phone(phone);
update subscribers set contact = norm_contact(contact) where norm_contact(contact) is not null and contact <> norm_contact(contact) and not exists (select 1 from subscribers x where x.contact = norm_contact(subscribers.contact));
update restock_requests set contact = norm_contact(contact) where norm_contact(contact) is not null and contact <> norm_contact(contact);
update reminders set contact = norm_contact(contact) where norm_contact(contact) is not null and contact <> norm_contact(contact);
update referrers set contact = norm_contact(contact) where norm_contact(contact) is not null and contact <> norm_contact(contact) and not exists (select 1 from referrers x where x.contact = norm_contact(referrers.contact));
update customer_meta set contact = norm_contact(contact) where norm_contact(contact) is not null and contact <> norm_contact(contact) and not exists (select 1 from customer_meta x where x.contact = norm_contact(customer_meta.contact));

-- ---------- the owner ----------
-- Replace with the email Ashi signs in with (the same one created in Authentication → Users).
insert into owners (email) values ('hello@budandthings.com') on conflict do nothing;
