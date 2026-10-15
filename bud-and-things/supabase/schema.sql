-- BUD & THINGS · database schema for Supabase (Postgres + storage).
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
-- Everything the site shows that can change without a code change lives here; the owner edits it from the
-- website's Owner view (#admin) after signing in. See README.md in this folder for the setup steps.

-- ---------- who may edit ----------
create table if not exists owners (email text primary key);
create or replace function is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from owners where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
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

do $$
declare t text;
begin
  -- drop and recreate so the file can be run again
  for t in select unnest(array['products','pairings','site_text','settings','stock','media','orders','reviews','subscribers','restock_requests','owners']) loop
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
-- visitors may send a review (held until the owner publishes it), sign up, or ask to hear about a restock
create policy "visitor" on reviews for insert with check (not published and length(name) between 1 and 60 and length(body) between 1 and 1500);
create policy "visitor" on subscribers for insert with check (length(contact) between 5 and 120);
create policy "visitor" on restock_requests for insert with check (length(contact) between 5 and 120 and length(sku) < 60);

-- ---------- placing an order ----------
-- Prices are checked against the products table and stock is taken off in the same step, so two people can never
-- buy the last piece. Payments stay simulated until the payment gateway is connected.
create or replace function place_order(o jsonb) returns text language plpgsql security definer set search_path = public as $$
declare it jsonb; n int; price int; sub int := 0; new_id text;
begin
  for it in select * from jsonb_array_elements(o -> 'items') loop
    n := (it ->> 'qty')::int;
    if n is null or n < 1 then raise exception 'bad_quantity'; end if;
    select (v ->> 'price')::int into price from products p, jsonb_array_elements(p.data -> 'variants') v where p.live and v ->> 'sku' = it ->> 'sku' limit 1;
    if price is null then raise exception 'unknown_item:%', it ->> 'sku'; end if;
    sub := sub + price * n;
    update stock set qty = qty - n, updated_at = now() where sku = it ->> 'sku' and qty >= n;
    if not found then raise exception 'sold_out:%', it ->> 'sku'; end if;
  end loop;
  if sub <> (o ->> 'sub')::int then raise exception 'price_changed'; end if;
  new_id := 'BT-' || nextval('order_no');
  insert into orders (id, data, status, phone, total) values (new_id, o || jsonb_build_object('id', new_id), 'Placed', o -> 'contact' ->> 'phone', (o ->> 'total')::int);
  return new_id;
end $$;

-- a customer can look up their own order with its number and their phone number
create or replace function get_order(order_id text, phone_no text) returns jsonb language sql stable security definer set search_path = public as $$
  select data || jsonb_build_object('status', status) from orders where id = order_id and phone = phone_no;
$$;
grant execute on function place_order(jsonb) to anon, authenticated;
grant execute on function get_order(text, text) to anon, authenticated;

-- ---------- photos and videos ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do update set public = true;
drop policy if exists "bt media owner write" on storage.objects;
drop policy if exists "bt media owner update" on storage.objects;
drop policy if exists "bt media owner delete" on storage.objects;
create policy "bt media owner write" on storage.objects for insert to authenticated with check (bucket_id = 'media' and is_owner());
create policy "bt media owner update" on storage.objects for update to authenticated using (bucket_id = 'media' and is_owner());
create policy "bt media owner delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and is_owner());

-- ---------- the owner ----------
-- Replace with the email Ashi signs in with (the same one created in Authentication → Users).
insert into owners (email) values ('hello@budandthings.com') on conflict do nothing;
