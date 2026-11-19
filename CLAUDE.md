# Claude-Projects: quick map for Claude

Read this first; open other files only when the task needs them. Owner-facing writing is plain, short English.

## What lives here
- `bud-and-things/` — the BUD & THINGS shop (budandthings.com): candles and Jesmonite objects, India, prices in ₹.
  - `prototype/index.html` (~5,300 lines) — the whole shop **and** the Owner view (`#admin`). One file, plain JS, no framework, no build.
    Helpers: `db.js` (Supabase link, `window.BTDB`), `import.js` (sheet import), `invoice.js`, `festive.js`, `room3d.js`/`products3d.js` (three.js 0.160, vendored in `prototype/vendor/`), `config.js` (public values only).
  - `supabase/` — `schema.sql`, Edge Functions `pay` (Razorpay), `delivery` (Shiprocket), `notify` (Resend); setup in `supabase/README.md`; what is live outside the repo in `supabase/DEPLOYED_STATE.md`.
  - `tools/` — builds (`build-shop-data.py`, `build-catalogue.py`, …) and tests (`test-*.js`).
  - `catalogue/`, `data/catalogue.sheet.json` — product data and photos. `brand/`, `system/` — logos, tokens, components.
  - `tasks/BACKLOG.md`, `tasks/LAUNCH_CHECKLIST.md` — **current to-do list; check here first** for "what's next".
  - `README.md` = decisions and stack; `WORKFLOW.md` = how to build, test, publish.
- `audit/` — 360° audit (2026-11-03). Facts to trust: `audit/BRIEF_FACTS.md`. Status: `28_CLOSEOUT_STATUS.md`. Findings: `26_MASTER_FINDINGS_REGISTER.md`. Don't read the whole folder.
- `docs/13_Project_Governance/MASTER_EXECUTION_PROMPT.md` — governance doc (draft, not approved).
- The 3D house and old intros moved to `abhiyknp/pixelpatra`.

## Fixed facts (don't re-derive)
- Stack: GitHub Pages behind Cloudflare · Supabase (DB, auth, email OTP sign-in) · Razorpay · Shiprocket · Resend · Cloudinary.
- Default theme Silk · Maroon & Gold: maroon #8F1834, dark #7A1229, gold #D6A34A, cream #F8F0E4, ink #150206. Fonts Cormorant Garamond + Lato.
- Not GST registered → bills of supply. Prepaid only. Shop in Coming soon mode.
- Never invent product claims (burn times, safety, "eco") or show stock photos as products.

## Test (from repo root)
```sh
sh bud-and-things/tools/preview.sh &          # http://localhost:8765/page.html
node bud-and-things/tools/mock-supabase.js &  # optional fake DB on :54321
node bud-and-things/tools/scan-secrets.js && node bud-and-things/tools/check-syntax.js
node bud-and-things/tools/test-flow.js        # main browser test; others: test-*.js (list in .github/workflows/audit.yml)
```
Playwright is found via `PLAYWRIGHT_PATH` or the global npm root. Check UI at 1280 px and 390 px: no console errors, no sideways scroll.

## Rules
- Work on the session branch; never push to `main` without the owner's OK. Publishing = merge to `main` → `.github/workflows/pages.yml` deploys https://abhiyknp.github.io/Claude-Projects/.
- No secrets in the repo (CI scans). Payment is confirmed only server-side by the `pay` function.
- Day-to-day content (text, products, prices, photos) is edited by the owner in the Owner view, not in code.
