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
select 'settings privacy checks passed';
