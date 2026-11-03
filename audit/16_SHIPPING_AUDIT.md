# 16 Shipping audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

Shiprocket integration exists in `supabase/functions/delivery`: PIN serviceability (visitor, 30/h), book shipment (owner only, creates order, AWB, pickup, label), tracking webhook with token moves order to Shipped/Delivered. STATIC.
Not tested: any live Shiprocket call (policy: no real shipments), credentials, webhook delivery, return workflow, failure handling beyond code reading.
