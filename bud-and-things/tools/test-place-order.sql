-- Checks place_order (schema.sql) on a real PostgreSQL: live shipping quotes, the weight band, expiry, and the flat fee.
-- Run by tools/test-sql.sh against a throw-away database. Any failed assert stops the run.
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111','meera@example.com');
insert into products (id, data) values ('p1','{"cat":"candles","name":"Vanilla Gold","weight":160,"variants":[{"sku":"A1","label":"Large","price":169}]}'),('p2','{"cat":"candles","name":"Strawberry","weight":165,"variants":[{"sku":"A2","label":"Large","price":169}]}');
insert into stock values ('A1',50),('A2',50);
insert into settings (key,value) values ('shipAuto','true'),('onlineOn','true'),('freeOver','1999'),('shipFee','99'),('maxOrdersHour','1000');
insert into ship_quotes (id,pin,slab,value,rate,fee,courier_id,courier,days,expires_at) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','208024',0.5,338,94.02,100,2,'Fast',2,now()+interval '30 minutes'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','208024',1.0,338,140,140,2,'Fast',2,now()+interval '30 minutes'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','208024',0.5,338,94.02,100,2,'Fast',2,now()-interval '1 minute');
create or replace function t_order(q text, pin text default '208024', phone text default '9876543210', n int default 1, total_adj int default 0) returns text language plpgsql as $$
declare r text; o jsonb;
begin
  set local role authenticated; perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);
  o := jsonb_build_object('contact', jsonb_build_object('name','Meera Rao','phone',phone),'address', jsonb_build_object('line1','1 Road','pin',pin,'city','Kanpur','state','Uttar Pradesh'),
    'method','Online','items', jsonb_build_array(jsonb_build_object('sku','A1','qty',n),jsonb_build_object('sku','A2','qty',1)),'sub',169*n+169,'total',169*n+169+total_adj);
  if q <> '' then o := o || jsonb_build_object('quote', q); end if;
  begin r := place_order(o); exception when others then r := 'ERROR: ' || sqlerrm; end;
  reset role; return r;
end $$;
create temp table r (t text, res text);
insert into r values ('live', t_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', total_adj => 100));
insert into r values ('wrong pin', t_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', pin => '560001', phone => '9876543211', total_adj => 100));
insert into r values ('expired', t_order('cccccccc-cccc-4ccc-8ccc-cccccccccccc', phone => '9876543212', total_adj => 100));
insert into r values ('wrong band', t_order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', phone => '9876543213', total_adj => 140));
insert into r values ('flat', t_order('', phone => '9876543214', total_adj => 99));
insert into r values ('bad text', t_order('not-a-uuid', phone => '9876543215', total_adj => 99));
insert into r values ('mismatch', t_order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', phone => '9876543216', total_adj => 99));
do $$ begin
  assert (select res from r where t = 'live') like 'BT-%', 'a live quote places the order';
  assert (select count(*) from orders where (data ->> 'ship')::int = 100 and (data -> 'shipQuote' ->> 'courier_id') = '2' and data ->> 'shipKg' = '0.5') = 1, 'the order keeps the fee, the courier and the weight band';
  assert (select res from r where t = 'wrong pin') = 'ERROR: ship_quote', 'a quote for another PIN is refused';
  assert (select res from r where t = 'expired') = 'ERROR: ship_quote', 'an expired quote is refused';
  assert (select res from r where t = 'wrong band') = 'ERROR: ship_quote', 'a quote for another weight band is refused';
  assert (select res from r where t = 'bad text') = 'ERROR: ship_quote', 'a made-up quote id is refused';
  assert (select res from r where t = 'flat') like 'BT-%', 'with no quote the order goes through';
  assert (select count(*) from orders where (data ->> 'ship')::int = 99 and data -> 'shipQuote' = 'null'::jsonb) = 1, 'with no quote the flat fee applies';
  assert (select res from r where t = 'mismatch') = 'ERROR: price_changed', 'a total that does not match is refused';
end $$;
select 'place_order checks passed' as result;
