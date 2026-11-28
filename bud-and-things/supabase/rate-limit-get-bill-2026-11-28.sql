-- Short invoice links (get_bill): one connection may try 60 codes an hour, like the order lookup does.
-- A real customer opening or reloading their link uses a handful. Changes no data. Safe to run twice.
-- Run in Supabase -> SQL Editor.
create or replace function get_bill(code_in text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform hit('bill', client_key(), 60, '1 hour');
  return (select data from bills where code = upper(trim(code_in)) limit 1);
end $$;
revoke execute on function get_bill(text) from public;
grant execute on function get_bill(text) to anon, authenticated;
