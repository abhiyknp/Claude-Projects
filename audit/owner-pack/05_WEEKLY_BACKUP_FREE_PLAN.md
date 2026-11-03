# Weekly backup while on the Supabase Free plan (about 15 minutes the first time, 2 minutes after)

Free has no backups. This makes your own copy of the shop data (products, stock, orders, invoices, customer profiles, settings, reviews). It does not copy login records or the photo files (keep the original photos in Drive). Upgrade to Pro on launch day or at about 50 orders, whichever is first; keep doing this anyway.

## One-time setup
1. Install the Postgres tools. Mac: install Homebrew (brew.sh), then in Terminal run `brew install libpq` and `brew link --force libpq`. Windows: install PostgreSQL from postgresql.org and tick only **Command Line Tools**.
2. Check: `pg_dump --version` prints a version number.
3. Supabase dashboard, your project, **Connect** (top) or Project settings, Database. Choose **Session pooler**, copy the **URI** string. Replace `[YOUR-PASSWORD]` with your database password (Project settings, Database, Reset database password if you forgot it; that does not affect the website).
4. Never paste this string in chat, the repo or a screenshot.

## Every week
1. Terminal in the project folder (the one that contains `bud-and-things`).
2. Type `BT_DB_URL='` then paste your string, then `'` and a space, then `sh bud-and-things/tools/backup-export.sh`. Together: `BT_DB_URL='postgresql://...' sh bud-and-things/tools/backup-export.sh`
3. Success looks like: `Saved /Users/you/BT-backups/bt-db-2026-11-10.sql.gz (… bytes, 25 tables, … tables with rows).`
4. Failure looks like `FAILED` or an error. Nothing is saved then. Send me the error text with the password hidden.
5. Move the file to your private Google Drive folder `BT backups` (2-step sign-in on). Keep the last 4. Do not email it.
6. Also keep the original product photo files in that Drive folder.

## Restore test (once, before launch)
Follow Part 1.4 of `backup-and-uptime-guide.md`: make an empty test project, load the file with `psql`, check `products`, `orders`, `stock` have rows, delete the test project. Send me the result.
