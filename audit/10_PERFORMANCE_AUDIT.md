# 10 Performance audit
> Audit date 2026-11-03. Status words used everywhere: **VERIFIED** (observed this session), **STATIC** (read from code, not run), **NOT TESTED**, **NOT IMPLEMENTED**, **NOT ASSESSABLE** (no access or no evidence), **N/A**.
> Test mode only. No orders, payments, messages, DNS or production changes. No secrets are printed in these reports.

Lighthouse 13-style run against the live URL from this sandbox, **1 run per form factor**. Caveat: the shop data host was unreachable, so the page rendered the Coming soon state with its load-failure banner. Real visitors with the database reachable may see different numbers.

| Metric | Mobile (simulated slow 4G) | Desktop |
|---|---|---|
| Performance | **65** | **96** |
| FCP | 1.2 s | 0.3 s |
| LCP | **6.0 s** | 1.3 s |
| TBT | **500 ms** | 30 ms |
| CLS | 0.003 | 0 |
| Speed index | 2.7 s | 0.9 s |
| Server response | 170 ms | 70 ms |
| Accessibility / Best practices / SEO | 100 / 96 / 100 | 100 / 96 / 100 |

Trend: mobile performance was 55 (LCP 6.1 s, TBT 960 ms) before the script split (F-19); now 65 (TBT halved). LCP is still 6 s on mobile. Over the wire: HTML 107 KB, catalogue 13 KB.
Caching: `cache-control: max-age=600` (GitHub Pages default; not configurable). Compression and CDN: Fastly edge, VERIFIED. Image formats: Cloudinary `f_auto,q_auto,w_720` for catalogue photos, VERIFIED in catalogue HTML.
Not measured: INP, real-user data, field data from CrUI, third-party script cost with analytics on.

## Independent validation note (2026-11-03)
Re-ran mobile Lighthouse twice more: Performance 73 and 78 (first run 65); LCP 5.9 s both times; TBT 260 ms and 120 ms (first run 500 ms). **Scores vary by about 13 points; LCP ≈ 6 s is stable.** Report the range 65–78, not a single number. Performance score in the scorecard stays 70.
