# 09 Security risk register
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

| ID | Risk | Severity | Confidence | Status |
|---|---|---|---|---|
| F-02 | Razorpay test secret was pasted in chat once; regeneration not verifiable | High → Medium (test key only) | Medium | OPEN, owner action |
| F-03 | No rate limit on `pay` (fix merged #74; deploy is owner step) | Medium | High | FIXED IN REPO, deploy NOT VERIFIED |
| F-04 | `verify` needs order id only | Medium → Low | High | OPEN (low value status leak) |
| F-05 | CORS `*` until `SITE_ORIGINS` set | Medium | High | OPEN, owner action |
| F-06/F-18 | No HSTS, X-Frame-Options, response-header CSP on GitHub Pages | Medium | High | ACCEPTED unless Cloudflare is added |
| F-07 | Owner two-step off | Low → Medium before launch | High | OPEN |
| F-08 | Preview code in public settings; hashed; old code works until changed | Low | High | OPEN owner action |
| F-12 | No backups/PITR/uptime monitor evidence | Medium | Medium | OPEN |
| F-15 | No secrets in repo | Info | High | PASS |
| F-16 | RLS on all tables | Info | High | PASS (static) |
| F-17 | Vendored libs without versions | Low | High | OPEN |
