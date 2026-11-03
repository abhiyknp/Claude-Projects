# Security headers with Cloudflare (free plan)

Why: GitHub Pages cannot send HSTS, X-Frame-Options or a frame-ancestors rule. Cloudflare sits in front and adds them. It also compresses and caches files at the edge, which helps speed.
This changes DNS, so **do it only when you are ready, and tell me first**. Total time about 45 minutes. Do not do it on the day of a launch or a campaign.

## Before you start
1. Write down every DNS record you have now (screenshot your registrar's DNS page). Email records (MX, SPF, DKIM, DMARC) must be kept exactly.
2. Note where you bought the domain (the registrar) and how you sign in there.
3. In GitHub, repo Settings, Pages: note the custom domain and that "Enforce HTTPS" is ticked.

## Steps
1. Make a free Cloudflare account. Click **Add a site**, enter `budandthings.com`, choose the **Free** plan.
2. Cloudflare reads your current DNS records. Compare them with your screenshot. Add anything missing. The records that point `budandthings.com` and `www` to GitHub Pages must stay. Set each web record to **DNS only** (grey cloud) for now.
3. Cloudflare shows two nameservers. At your registrar, replace the domain's nameservers with those two. Wait until Cloudflare says the site is **Active** (minutes to a few hours). The site stays up during this.
4. Check the site still opens at https://budandthings.com/.
5. In Cloudflare, **SSL/TLS**, Overview: set the mode to **Full (strict)**. Then **Edge Certificates**: turn on **Always Use HTTPS** and **Automatic HTTPS Rewrites**.
6. Turn the two web records (apex and www) to **Proxied** (orange cloud). Check the site again. If GitHub shows a certificate warning in Pages settings, wait 15 minutes and untick/tick "Enforce HTTPS".
7. **HSTS**: SSL/TLS, Edge Certificates, **HSTS**. Start with max-age **6 months**, include subdomains **off**, preload **off**. (Preload is very hard to undo; do not turn it on until the site has run on HTTPS only for months.)
8. **Response headers**: Rules, **Transform Rules**, **Modify Response Header**, create a rule that applies to all incoming requests for `budandthings.com`, and **Set static** these headers:
   - `X-Content-Type-Options` = `nosniff`
   - `X-Frame-Options` = `DENY`
   - `Referrer-Policy` = `strict-origin-when-cross-origin`
   - `Permissions-Policy` = `camera=(), microphone=(), geolocation=()` (do not add `payment`: it can block the Razorpay window)
   - `Content-Security-Policy` = leave as is (the site already sends its own policy inside the page). Only add `frame-ancestors 'none'` if you use a header rule for CSP; ask me for the exact text.
9. **Speed**: Speed, Optimization: Brotli on. Caching: Browser Cache TTL "Respect existing headers". Do not turn on Rocket Loader or Auto Minify (they can break the script).
10. **Email**: if you receive mail at @budandthings.com, send yourself a test email after the nameserver change.

## Check it worked (ask me to run this too)
```
curl -sI https://budandthings.com/ | grep -i -E "strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy"
```
You should see all five. Then open the site on your phone, open the catalogue, add something to the cart in the Owner preview, and place one test order.

## If something breaks (rollback)
In Cloudflare DNS, switch both web records back to **DNS only**. If that is not enough, put the registrar's original nameservers back. Nothing in the site's code needs changing.

## Cost and trade-offs
Free. Cloudflare becomes another company that sees your traffic. The site works without it. If you skip this, the accepted risk is: someone can put your site inside a frame on another page (clickjacking). That is low for a shop with no money forms on your own pages (Razorpay opens its own window).
