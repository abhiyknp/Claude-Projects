# 13 Accessibility audit (WCAG 2.2 AA target)
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

- Lighthouse accessibility **100** (mobile and desktop) on `/` — automated only.
- `tools/audit.js` pre-merge checks pass on 13 pages at 2 widths: contrast, text size, tap targets, headings, alt text, link and field names, skip link, no sideways scroll.
- Live sweep: no missing alt, no targets under 24 px, one H1 per page except `/catalogue/light/` (6).
- Sold-out state is conveyed by text ("Sold out"), not by colour alone. Greyed images are decorative.
- NOT TESTED: screen-reader pass (NVDA/VoiceOver), keyboard-only walk of checkout, text resize to 200%, reduced-motion behaviour, focus order in the 3D room. **Automated scores alone do not prove AA.**
