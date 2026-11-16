# Uptime monitoring (what is set up and how to check it)

Facts below come from the close-out report (`audit/28_CLOSEOUT_STATUS.md`, owner-reported 2026-11-03).

## Two layers
1. **UptimeRobot**: two monitors, one for the home page and one for the catalogue (it looks for a keyword on the page). Alerts go to email only. The owner saw a test alert, a real down alert and an "up again" alert.
2. **GitHub site check** (`.github/workflows/uptime.yml`): every 15 minutes it opens the home page and the catalogue, and reads one public settings row from the database with the public key. If any of them fails twice in a row it opens an issue called "Site check failed", and closes it when the site is back. GitHub can delay scheduled runs by some minutes, so this backs up UptimeRobot and doesn't replace it. The database read also counts as activity, which helps stop a Free-plan project being paused.

## If you get an alert
1. Open https://budandthings.com/ and /catalogue/ in a private window.
2. If the page loads but the shop is empty, open the Supabase dashboard: a Free project can be paused or briefly down.
3. The daily site rebuild fails rather than publish a broken site, so the last good site stays online.
4. Check GitHub → Actions for a failed run.

## Check it still works (every few months)
- Pause one UptimeRobot monitor, wait for the alert email, then resume it.
- Actions → Site check → Run workflow, and confirm it ends green.
