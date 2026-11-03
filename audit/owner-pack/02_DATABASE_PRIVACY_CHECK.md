# Database privacy check (about 2 minutes, safe)

This proves a visitor with the **public key** cannot read orders, customers, coupons and other private tables. It only reads. It prints table names and row counts, never any customer data.

1. Install Node.js from nodejs.org if you do not have it (any recent version).
2. In a terminal, in your copy of the repo:
   ```
   node bud-and-things/tools/rls-probe.js
   ```
3. Read the last line:
   - `RESULT: PASS` = good. Copy the whole output into a note with today's date.
   - `RESULT: FAIL` = a private table returned rows. Do **not** open the shop. Send me the output (it has no data in it) and I will fix the database rules.
   - `NOT TESTED` = no internet, or the project is paused. Try again.

Run it again after any change to `supabase/schema.sql`, and once more the day before launch.
It does not test who can write. The rules for that are reviewed in the audit (static review). Ask me if you want a write test designed for a throwaway test project.
