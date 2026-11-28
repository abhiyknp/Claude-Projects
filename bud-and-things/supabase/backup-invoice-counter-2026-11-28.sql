-- Lets the Owner backup also save the invoice number counter (it was skipped: "permission denied for table invoice_counters").
-- Only the owner can read it; customers and visitors still get nothing, and nobody can change it from the browser.
-- Safe to run twice. Run in Supabase -> SQL Editor.
revoke all on invoice_counters from anon, authenticated;
grant select on invoice_counters to authenticated;
drop policy if exists "owner" on invoice_counters;
create policy "owner" on invoice_counters for select using (is_owner());
