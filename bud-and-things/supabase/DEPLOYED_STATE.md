# What is deployed outside this repository

The site (GitHub Pages) is built from this repository automatically. The items below are **not**: someone has to
apply them by hand, so what is live can differ from the code here. Fill in the last two columns each time you change
one. "Not recorded" means nobody has written it down yet; it does not mean it is missing.

| Item | Where it lives | How to apply | Last applied | Checked by |
|---|---|---|---|---|
| Database tables, rules and functions | Supabase → SQL Editor | Paste all of `supabase/schema.sql` and Run (safe to repeat) | Not recorded | |
| `pay` function | Supabase Edge Functions | `supabase functions deploy pay --no-verify-jwt` | Not recorded | |
| `delivery` function | Supabase Edge Functions | `supabase functions deploy delivery --no-verify-jwt` | Not recorded | |
| `notify` function | Supabase Edge Functions | `supabase functions deploy notify --no-verify-jwt` | Not recorded | |
| Function secrets (names only) | Supabase → Edge Functions → Secrets | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_WEBHOOK_TOKEN`, `RESEND_API_KEY`, `NOTIFY_TOKEN`, `NOTIFY_FROM`, `SITE_URL`, `SITE_ORIGINS` | Not recorded | |
| Email schedule (`bt-notify`, `bt-notify-daily`) | Supabase → SQL Editor (`pg_cron`, `pg_net`) | See "Messages to customers" in `supabase/README.md` | Not recorded | |
| Owner two-step (`owner_two_step()` and `ownerTwoStep` in `prototype/config.js`) | Both | See `supabase/README.md` step 7 | Off | |
| Cloudflare headers and SSL | Cloudflare dashboard | `audit/owner-pack/01_CLOUDFLARE_SECURITY_HEADERS.md` | 2026-11-03 (HSTS one day) | Verified with curl, 2026-11-03 |
| Uptime monitors | UptimeRobot | `audit/owner-pack/06_UPTIME_MONITORING.md` | 2026-11-03 | Owner (test alerts received) |
| Weekly backup export | Owner's computer | `audit/owner-pack/05_WEEKLY_BACKUP_FREE_PLAN.md` | Not recorded | |

Never write a secret's value in this file. Names only.

## Changes in the repository that need a manual step after merge

| Date | Change | Step needed |
|---|---|---|
| 2026-11-16 | `schema.sql`: index on the courier tracking number (`orders_awb`) | Run `schema.sql` again |
| 2026-11-16 | `_shared/util.ts`: requests with no visitor address now use their own, stricter limit bucket | Redeploy `pay` and `delivery` |
