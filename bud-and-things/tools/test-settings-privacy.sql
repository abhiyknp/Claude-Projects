-- The full address (bizAddress) is hidden from visitors and signed-in customers, but invoices still carry it.
-- Run by tools/test-sql.sh after schema.sql. Any failed assert stops the run.
-- Supabase grants table access to these roles by default; the row rules decide what they see
grant select on settings to anon, authenticated;
insert into settings (key, value) values ('bizAddress', '"Flat 9 Private Tower"'), ('siteAddress', '"Public Area"')
  on conflict (key) do update set value = excluded.value;
do $$ declare n int; begin
  set local role anon;
  select count(*) into n from settings where key = 'bizAddress'; assert n = 0, 'anon can read bizAddress';
  select count(*) into n from settings where key = 'siteAddress'; assert n = 1, 'anon cannot read siteAddress';
  reset role;
  set local role authenticated;
  select count(*) into n from settings where key = 'bizAddress'; assert n = 0, 'a customer can read bizAddress';
  reset role;
  assert cfg_text('bizAddress', '') = 'Flat 9 Private Tower', 'the server cannot read bizAddress for invoices';
end $$;
-- the invoice number counter: only the owner may read it (for the backup)
insert into invoice_counters (fy, kind, last) values ('26-27', 'test', 5) on conflict do nothing;
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'boss@example.com') on conflict do nothing;
insert into owners (email) values ('boss@example.com') on conflict do nothing;
do $$ declare n int; begin
  set local role anon;
  begin select count(*) into n from invoice_counters; assert false, 'anon can read the counter'; exception when insufficient_privilege then null; end;
  reset role;
  set local role authenticated; perform set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);
  select count(*) into n from invoice_counters; assert n = 0, 'a customer can read the counter';
  perform set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', true);
  perform set_config('request.jwt.claims','{"aal":"aal2"}', true);
  select count(*) into n from invoice_counters; assert n >= 1, 'the owner cannot read the counter';
  reset role;
end $$;
-- short invoice links: a real code works, and a connection is stopped after 60 tries an hour
insert into bills (code, order_id, data) values ('ABCD2345', 'BT-1-ABCDEF', '{"hello":"bill"}');
do $$ declare r jsonb; n int := 0; stopped boolean := false; begin
  set local role anon;
  r := get_bill('abcd2345'); assert r ->> 'hello' = 'bill', 'a real short link opens';
  assert get_bill('ZZZZ9999') is null, 'an unknown code finds nothing';
  begin
    for i in 1..70 loop n := n + 1; perform get_bill('QWER' || lpad(i::text, 4, '0')); end loop;
  exception when others then stopped := sqlerrm = 'too_many_requests'; end;
  reset role;
  assert stopped, 'a connection is stopped after too many short-link tries';
  assert n between 55 and 62, 'the stop comes at about 60 tries, not at once and not never (stopped at ' || n || ')';
end $$;
select 'settings privacy checks passed';
