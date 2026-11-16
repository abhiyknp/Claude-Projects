# BUD & THINGS backlog

Taken from `../../audit/legal/TODO.md`, `../../audit/26_MASTER_FINDINGS_REGISTER.md` and
`../../audit/28_CLOSEOUT_STATUS.md` (state as of 2026-11-05). Add new requests at the top of "Claude can do".

## Claude can do (code or docs)
| ID | Task | Source | Notes |
|---|---|---|---|
| T-001 | Mobile load time fix for the live home page (LCP about 6 s locally improved to 2.9 s) | F-19 | Needs the owner's phone Lighthouse result first |
| T-002 | Update policies and Pack details after the CA answers | F-14, legal TODO | Waiting on the CA |
| T-003 | Review the remaining marketing text for risky claims (one soft line: "less soot and a cleaner jar") | legal TODO | |
| T-004 | Add a phone-number check on the `pay` verify step | F-04 | Optional, low priority |
| T-005 | Add lint and a vendor CVE check to CI | F-10, F-17 | |
| T-006 | Sitemap lists products after launch | F-20 | When Coming soon is turned off |
| T-007 | Re-run the independent audit after the CA replies and the owner steps are done | audit | |

## Needs the owner
| ID | Task | Source |
|---|---|---|
| O-001 | Send the CA email with the review pack | legal TODO |
| O-002 | Send the licence enquiries (labour, Greater Noida Authority, fire, RWA) | legal TODO |
| O-003 | Live shop test rows 13 (Shiprocket label), 16 (policy details filled) and 17 (turn off Coming soon) | F-21, owner-pack/03 |
| O-004 | Turn on owner two-step and set a new preview code | F-07, F-08 |
| O-005 | Weekly backup export until Supabase Pro (at about 50 orders or launch day) | F-12 |
| O-006 | Burn tests per product, plus the safety, cost and batch records | owner-pack/templates |
| O-007 | Raise HSTS to 6 months after a week with no problems | F-06/F-18 |
| O-008 | Fragrance SDS and IFRA certificate, product liability insurance quote, trademark | legal TODO |
| O-009 | Final product photos to replace the temporary sheet images; original logo files | README |
