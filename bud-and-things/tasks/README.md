# BUD & THINGS: task workspace

This folder is for tasks on **BUD & THINGS by Ashi** (budandthings.com) only.
Other projects go in their own repositories.

## The project in short

- **What it is:** a gift shop for hand-poured candles and Jesmonite objects. The tagline is "Thoughtful objects. Meaningful moments."
  The brand lockup is BUD & THINGS, and Ashi signs the Our Story note and the footer.
- **Site:** `prototype/index.html` is the whole shop in one file, with no build step. It uses hash routes
  (`#home`, `#shop`, `#p-<id>`, `#checkout`, `#admin`, and so on). It is published to GitHub Pages by
  `.github/workflows/pages.yml` on each push to `main` and once a day.
- **Catalogue page:** `catalogue/` holds the public catalogue, the Diwali page, the light page and the share pages.
  It is built by `tools/build-catalogue.py` and `tools/catalogue-live.js`.
- **Data:** Supabase (`supabase/schema.sql`) holds products, text, settings, stock, orders, coupons, invoices
  and rewards. The owner edits all of it in **Owner view** (`#admin`), so day-to-day changes need no code.
- **Edge Functions:** `pay` (Razorpay checkout and webhook), `delivery` (Shiprocket PIN check, courier booking
  and tracking) and `notify`.
- **Brand:** the logo, monogram and pattern masters are in `brand/`. Design tokens, components, icons and print
  and social templates are in `system/`. The default theme is Silk · Maroon & Gold.
- **Audit and launch:** the audit reports are in `../audit/`. The status of each finding is in
  `../audit/26_MASTER_FINDINGS_REGISTER.md` and `../audit/28_CLOSEOUT_STATUS.md`. The owner's launch list is in
  `../audit/legal/TODO.md`. The current decision is **NOT READY for public launch**: no critical defect is known,
  but evidence is missing.
- **Recent work (Nov 2026):** offline orders with a WhatsApp pay page, invoices that show amounts paid and due,
  a cookie consent banner, a publish pop-up for missing details, and prices on the catalogue.

Read first: `../README.md` (decisions), `../WORKFLOW.md` (how it is built, tested and published),
`../supabase/README.md` (setup).

## How tasks work here

| Place | What goes there |
|---|---|
| `BACKLOG.md` | Open items, newest priorities at the top. Each item is one line with a short ID such as `T-001`. |
| `active/T-xxx-short-name.md` | A task being worked on. Copy `_TEMPLATE.md` to start one. |
| `done/` | Finished task notes. Move the file here and add the PR link. |

Steps for each task:
1. Pick an item from `BACKLOG.md` (or add a new one), copy `_TEMPLATE.md` to `active/`, and fill in the goal and the
   definition of done.
2. Do the work on the session branch. Keep changes to `bud-and-things/`, `audit/` and the workflows that serve them.
3. Test it, following `../WORKFLOW.md` section 6:
   `sh tools/preview.sh &`, then `node tools/test-flow.js`, plus the `tools/test-*.js` file for the area you changed.
   Check at 1280 px and 390 px, with no page errors and no sideways scrolling.
4. Open the PR, then record the result and the PR link in the task file and move it to `done/`.

House rules carried over from the project:
- Never make up claims about real products (safety, burn time, "non-toxic", and so on).
- Legal items are confirmed by the CA. Policy text stays a draft until it is reviewed.
- Never commit secrets. `tools/scan-secrets.js` runs in CI.
- Use plain language in owner-facing text.
