-- Hides the full registered address (setting bizAddress) from website visitors. 28 Nov 2026.
-- Invoices and bills of supply keep it: the server makes them and still reads it, and you still see it in Owner view.
-- Run in Supabase -> SQL editor. Safe to run more than once. Changes no data, only who may read that one setting.
begin;
drop policy if exists "read" on settings;
create policy "read" on settings for select using (key <> 'bizAddress');
commit;

-- check: should list one policy "read" with (key <> 'bizAddress')
select policyname, qual from pg_policies where tablename = 'settings';
