# 17 India compliance audit — not legal advice
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

| Requirement | Applicability | Current evidence | Gap | Action |
|---|---|---|---|---|
| Consumer Protection (E-Commerce) Rules 2020: seller details, grievance officer, price inclusive of taxes, return terms | Applies to online sale | Policy templates include business details, grievance officer, 48-hour acknowledgement; prices show "Inclusive of all taxes" (VERIFIED in app text) | Real names, address, phone are owner settings, not verified | Owner fills settings; CA/lawyer review |
| DPDP Act 2023 | Applies (collects emails, phones, addresses) | Privacy page exists (`#privacy`), customer data delete function in Owner view (STATIC) | Consent wording, retention, breach process not reviewed | Legal review |
| GST | Owner position: not registered, below threshold, invoices are bills of supply | Settings `gstOn:false` | Marketplace (Amazon) sales may require GSTIN regardless of turnover — confirm | Ask CA |
| Legal Metrology (Packaged Commodities) | Likely applies to pre-packed candles sold by net quantity | Size/weight fields exist | Label content (net quantity, MRP, maker, month/year) NOT ASSESSABLE | CA/legal; check packaging |
| IT Act intermediary/privacy rules | Applies to site | Policies | Not reviewed | Legal review |
| Udyam | Registered per owner | Not shown on site | Optional disclosure | Owner decision |
Nothing here is declared exempt or compliant.

## Independent validation note (2026-11-03)
The GST/marketplace line is an open question for a CA, not a finding; the report does not say GST is required. Every row stays "needs professional confirmation".
