# 15 Payment readiness
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

Keep these four separate:
1. **Technical readiness (STATIC):** Razorpay order creation server-side, signature verification, signed webhook, rate limits, duplicate-payment guard by order state, refund noted in Owner view. Deployment of the rate-limited version and `SITE_ORIGINS` are owner steps (not verified).
2. **Business documentation readiness:** policies and FAQ now describe Razorpay online payment alongside UPI QR (#92). Contact details, grievance officer and business address are settings the owner must fill (`bizName`, `bizAddress`, `grievanceName`, `grievancePhone`): current values NOT ASSESSABLE.
3. **Merchant approval:** Razorpay KYC. The brief says Cashfree was rejected and PayU is under discussion; the repo uses Razorpay. Approval status is NOT VERIFIED here.
4. **Actual integration status:** owner reports a live test with a refund on 2026-11-03. NOT INDEPENDENTLY VERIFIED: no access to Razorpay or the database. To accept it as evidence: matched amount, order marked paid, webhook delivery log, refund id.
No merchant approval is claimed.

## Independent validation note (2026-11-03)
Server-side amount, signed webhook, settle-once logic CONFIRMED by re-reading code. The owner's live test remains unverified.
