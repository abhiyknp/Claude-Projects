# Live shop test checklist (use a phone and a laptop, a different network than usual)

Fill the Result column (Pass / Fail / Note). Send me the table and screenshots of any fail. Use a small order with a real payment you refund afterward. Never share card numbers, payment ids with full secrets, or keys.

| # | Step | Expected | Result |
|---|---|---|---|
| 1 | Open https://budandthings.com/ on phone, no login | Shop (or Coming soon) loads, no error banner | |
| 2 | Open https://budandthings.com/catalogue/ | All pieces with photos and prices; sold-out ones greyed | |
| 3 | Open one product page; change option | Price and stock note change | |
| 4 | Sold-out product | "Sold out. A new batch is being prepared." and a restock box | |
| 5 | Add 2 items to the cart; change quantity; remove one | Totals update | |
| 6 | Checkout with a wrong phone number | Clear error, no crash | |
| 7 | Pay with Razorpay (small order) | Razorpay window opens; payment succeeds | |
| 8 | Order page after payment | "Thank you", status Paid, amount equals what you saw | |
| 9 | Owner view: the order | Marked paid; amount matches Razorpay | |
| 10 | Razorpay dashboard, Webhooks | Delivery log shows success for this order | |
| 11 | Cancel or refund the test order in Razorpay | Refund id exists; Owner view shows it | |
| 12 | Order confirmation message | Arrives (email/WhatsApp as set up), correct name and amount | |
| 13 | Shipping: book a courier for a **test** order only if Shiprocket test mode allows | Label and AWB appear, or a clear error | |
| 14 | Reload the shop after step 8 | Stock went down by the quantity bought | |
| 15 | Try the site on Safari (iPhone) and Firefox | No layout break, checkout opens | |
| 16 | Policies: Privacy, Terms, Shipping, Refunds, FAQ | Open and mention Razorpay; business name, address and grievance officer are filled in | |
| 17 | Turn off Coming soon only after 1 to 16 pass | Shop public | |
