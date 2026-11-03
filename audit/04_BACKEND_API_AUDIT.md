# 04 Backend and API audit (static review)
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

Live endpoints were NOT called (policy: no production probes; also unreachable from the sandbox).

| Endpoint | Method | Auth | Review |
|---|---|---|---|
| `pay` action start | POST | visitor, rate-limited 20/h | Creates Razorpay order. Amount computed server-side from the order row (STATIC). |
| `pay` action verify | POST | visitor, 120/h | Checks Razorpay signature; returns status. Needs order id only (F-04). |
| `pay` webhook | POST | `x-razorpay-signature` HMAC, constant-time compare | 401 on bad signature. Exempt from visitor rate limit by design. Pass (STATIC). |
| `delivery` pin | POST | visitor, 30/h | Courier serviceability. |
| `delivery` book | POST | owner only (`is_owner()` RPC) | Books Shiprocket shipment. Pass (STATIC). |
| `notify` run / daily | POST | `x-notify-token` | Sends queued messages. Pass (STATIC). |
| REST via anon key | GET/POST | RLS | See 05. |

Checks: input validation present on ORDER_ID pattern and lengths; CORS is `*` unless `SITE_ORIGINS` is set (F-05, owner step); service key used only inside functions (STATIC); secrets read from environment, none committed (VERIFIED by pattern scan: only docs mention key prefixes).
Not verified: deployed function version includes rate limits (F-03 fix is in repo; deploy is an owner step); race conditions; error-code consistency under load.

## Independent validation note (2026-11-03)
Re-read `pay/index.ts`: the browser sends only an order number; the total comes from the database; a Razorpay order for a stale total is not reused; payment is recorded only when Razorpay reports `paid` for the full amount, once. Claims CONFIRMED (STATIC).
