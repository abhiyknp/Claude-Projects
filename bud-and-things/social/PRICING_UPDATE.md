# When the new pricing arrives (Friday): what to re-check

Prices, shipping and the free-shipping amount are being decided by the team. Until they are, the plan quotes **item prices from the catalogue** and **no shipping amounts**. Re-check these after the update.

1. **Catalogue prices:** update `catalogue/products.json` (and the sheet snapshot) first. The graphics read prices from it, so the templates update by themselves. Run `node social/check.js`: it flags any caption that quotes a catalogue product at a price that no longer matches.
2. **Price ladders in captions** are written by hand and are *not* all caught by the checker. Search `captions/` and `reels/` for `₹` and update: `S04-IG`, `1118`-style ladder lines, `1130-IG`, `1201-IG`, `1202-IG`, `1212-IG`, `1223-IG`, `1230-IG`, the Reel 05 shot list, the YouTube and Pinterest copy, and `STUDY.md` section 3. I can do this pass when you send the new list.
3. **Gift wrap price:** currently ₹99 in several captions (`1205-IG`, `1211-IG`, `1217-IG`, `1130-IG` mention it). Confirm.
4. **Shipping:** no caption quotes a shipping amount now. Once decided, add one clear line to the FAQ Highlight and `REPLY-delivery` in `OUTREACH.md`.
5. **Bundles:** if the team adds a bundle (for example a Secret Santa set), tell me the name, contents, price and stock. I will add a template, a post and a Reel line for it.
6. **Bio:** "From ₹15" (BIO-1, BIO-2) must stay true. If the cheapest item changes, change the bio.
7. **Welcome offer:** confirm whether HELLO10 stays; update the offer line in `captions/instagram.md` if not.
