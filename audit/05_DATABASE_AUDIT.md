# 05 Database audit (static review of `schema.sql`)
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

- 25 tables, **RLS enabled on all 25**; 38 policies. Public read is limited to: published products/pairings/media/reviews, `site_text`, `settings`, `stock`. Everything else is owner-only. Visitors can only **insert** into reviews (unpublished), subscribers, restock_requests, reminders, events, each with length checks. STATIC.
- Sensitive functions (`mark_paid`, `set_shipment`, `hit`, notes) revoke anon/authenticated and grant `service_role` only. STATIC.
- `settings` and `site_text` are world-readable by design: they hold public copy and a hashed Coming-soon preview code (F-08). Owner must not store anything private in `settings`.
- Storage policies: owner-only write on the `media` bucket. STATIC.
- **Live RLS probe with the public key: NOT TESTED.** It was attempted and blocked by the session's production-read guard; no production data was read. Recommended: owner runs one read of `orders`, `customers`, `coupons` with the anon key and expects empty or 401.
- Backups/PITR: NOT ASSESSABLE (Supabase plan unknown; free plan has none; F-12).
- Indexes, query performance, migrations history: NOT TESTED (no DB access).

## Independent validation note (2026-11-03)
Counts re-run: 25 `create table`, 25 `enable row level security`, 38 `create policy`. CONFIRMED. Still static only; the live probe was not run.
