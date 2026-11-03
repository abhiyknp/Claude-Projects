# 11 Infrastructure audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

| Item | Result |
|---|---|
| Host | GitHub Pages, edge Fastly, region iad. VERIFIED. |
| Custom domain, www → apex 301 | VERIFIED. |
| HTTPS | Site answers on 443. Certificate details and http→https redirect NOT TESTED (sandbox). GitHub "Enforce HTTPS" setting: owner to confirm. |
| DNS records (A/AAAA/CNAME/CAA/MX/SPF/DKIM) | NOT ASSESSABLE from here. |
| Deploy pipeline | `pages.yml` on push to main and daily; step "catalogue-live" rebuilds catalogue from DB and falls back to static page on any error. STATIC; the live catalogue shows DB photos and sold-out badges, so it works in production (VERIFIED). |
| Environment separation | One production project; local preview uses a mock DB. No staging. |
| Monitoring / backups / uptime | No evidence (F-12). |
| Rollback | Revert PR; Pages redeploys on push. |
