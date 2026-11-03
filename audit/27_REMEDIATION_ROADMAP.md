# 27 Remediation roadmap
> Audit date 2026-11-03. Test mode only; no production changes; no secrets printed. Status words: VERIFIED, STATIC, NOT TESTED, NOT IMPLEMENTED, NOT ASSESSABLE, N/A.

## Stage 1: immediate (owner actions, no code)
| Finding | Action | Acceptance | Effort |
|---|---|---|---|
| F-02 | Regenerate Razorpay keys; put new ones in Supabase secrets | Old key refused | XS |
| F-05 | Set `SITE_ORIGINS` | Other origins refused | XS |
| F-03 | Deploy `pay` | 429 after 20 starts/h | XS |
| A-10 | Anon-key read of private tables | Empty/401 | XS |

## Stage 2: launch blockers
F-13 payment evidence (payment id, webhook delivery, refund id); F-12 backups, uptime monitor, restore test; F-07 owner two-step; F-14 legal review of policies, GST/marketplace question, Legal Metrology label check; F-21 live shop test by someone with network access; A-09 browser matrix; fill business name, address, grievance officer in settings; turn off Coming soon only after all above.

## Stage 3: high value
F-19/A-04 mobile LCP and TBT (defer non-critical JS, lighter first render); A-02 heading fix; real product photos in Owner view (retire SNAP_IMG); screen-reader and keyboard pass; analytics IDs and consent; sitemap retest after launch.

## Stage 4: long term
Cloudflare for HSTS/headers (ask before DNS change); CSP tightening (A-05); vendor version file and CVE scan (F-17); split the single script file; per-SKU cost sheet and test records; marketplace integrations.
