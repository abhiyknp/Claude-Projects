// BUD & THINGS · delivery through Shiprocket (a Supabase Edge Function).
//
//   { action: 'pin', pin }               → can a courier reach this PIN code, and in how many days (any visitor,
//                                          30 checks an hour each)
//   { action: 'quote', pin, items }      → the shipping fee for this cart and PIN code from Shiprocket's live rates, using the
//                                          quickest courier (any visitor, 30 a hour each). Only when the owner has switched
//                                          on live shipping (setting shipAuto). The price is saved for 30 minutes as a quote
//                                          that place_order checks, so the browser can never set its own shipping fee.
//   { action: 'book', order_id, ... }    → the owner books the courier for a paid order: Shiprocket order, AWB number,
//                                          pickup request and shipping label, all in one go (owner only). With the setting
//                                          autoBook on, the pay function does this by itself once a payment is confirmed.
//   Shiprocket's tracking webhook, with the token set in Shiprocket → Settings → API → Webhooks, moves the order to
//   Shipped and Delivered on its own.
//
// Set up: see "Delivery (Shiprocket)" in supabase/README.md.
import { env, dbReady, db, setting, allowed, isOwner, same, reply, cors } from '../_shared/util.ts';
import { sr, setShipment, bookOrder, BookError, quickest, feeFor, slabKg, pieceGrams, isOn } from '../_shared/shiprocket.ts';

// what a Shiprocket tracking status means for the order
function stepFor(s: string) {
  s = String(s || '').toUpperCase();
  if (/RTO|RETURN|LOST|DAMAGE|CANCEL/.test(s)) return '';
  if (/^DELIVERED$/.test(s)) return 'Delivered';
  if (/PICKED UP|IN TRANSIT|SHIPPED|OUT FOR DELIVERY|REACHED|DESTINATION|DISPATCHED/.test(s)) return 'Shipped';
  return '';
}

export async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'post_only' });
  if (!env('SHIPROCKET_EMAIL') || !env('SHIPROCKET_PASSWORD') || !dbReady()) return reply(req, 503, { error: 'delivery_not_set_up' });
  const raw = await req.text();

  try {
    // Shiprocket's tracking webhook carries the token chosen when it was set up
    const hook = req.headers.get('x-api-key');
    if (hook !== null) {
      if (!env('SHIPROCKET_WEBHOOK_TOKEN') || !same(hook, env('SHIPROCKET_WEBHOOK_TOKEN'))) return reply(req, 401, { error: 'bad_token' });
      const ev = JSON.parse(raw || '{}'), awb = String(ev.awb || '');
      // found by the AWB number booked for it (Shiprocket's order_id here isn't always ours)
      const o = /^[A-Za-z0-9]{6,30}$/.test(awb) && (await db('/rest/v1/orders?select=id&data->parcel->>awb=eq.' + encodeURIComponent(awb)))[0];
      if (o) await setShipment(o.id, { status: String(ev.current_status || ''), etd: ev.etd || null, updated: new Date().toISOString() }, stepFor(ev.current_status));
      return reply(req, 200, { ok: true });
    }

    let b: Record<string, any>;
    try { b = JSON.parse(raw); } catch { return reply(req, 400, { error: 'bad_request' }); }

    if (b.action === 'pin') {
      const pin = String(b.pin || '');
      if (!/^[1-9][0-9]{5}$/.test(pin)) return reply(req, 400, { error: 'bad_pin' });
      if (!(await allowed(req, 'pin', 30, '1 hour'))) return reply(req, 429, { error: 'too_many_requests' });
      const from = String(await setting('pickupPin', ''));
      if (!/^[1-9][0-9]{5}$/.test(from)) return reply(req, 503, { error: 'pickup_pin_not_set' });
      const d = await sr(`/courier/serviceability/?pickup_postcode=${from}&delivery_postcode=${pin}&weight=${Number(await setting('parcelKg', 0.5)) || 0.5}&cod=0`).catch((e) => {
        if (/not serviceable|no courier/i.test(e.message)) return {}; throw e; });
      const list = d?.data?.available_courier_companies || [];
      if (!list.length) return reply(req, 200, { ok: false });
      const days = Math.min(...list.map((c: any) => Number(c.estimated_delivery_days) || 99));
      return reply(req, 200, { ok: true, days: days < 99 ? days : null, city: list[0].city || null });
    }

    if (b.action === 'quote') {
      if (!isOn(await setting('shipAuto', false))) return reply(req, 200, { ok: false, reason: 'off' });
      const pin = String(b.pin || '');
      if (!/^[1-9][0-9]{5}$/.test(pin)) return reply(req, 400, { error: 'bad_pin' });
      if (!(await allowed(req, 'quote', 30, '1 hour'))) return reply(req, 429, { error: 'too_many_requests' });
      const from = String(await setting('pickupPin', ''));
      if (!/^[1-9][0-9]{5}$/.test(from)) return reply(req, 200, { ok: false, reason: 'pickup_pin_not_set' });
      // what is in the cart comes from the products table, never from the browser: price and weight of each SKU
      const items: any[] = Array.isArray(b.items) ? b.items.slice(0, 20) : [];
      const prods: any[] = (await db('/rest/v1/products?select=data&live=eq.true')) || [];
      const pieceG = Number(await setting('pieceG', 300)) || 300, packG = Number(await setting('packG', 100)) || 100;
      let value = 0, grams = 0;
      for (const it of items) {
        const qty = Number(it && it.qty), sku = String(it && it.sku || '');
        if (!(qty >= 1 && qty <= 99) || !Number.isInteger(qty)) return reply(req, 400, { error: 'bad_items' });
        let hit: { price: number; w: number } | null = null;
        for (const p of prods) { const v = (p.data?.variants || []).find((x: any) => x.sku === sku); if (v) { hit = { price: Number(v.price), w: pieceGrams(p.data?.weight, pieceG) }; break; } }
        if (!hit) return reply(req, 400, { error: 'bad_items' });
        value += hit.price * qty; grams += hit.w * qty;
      }
      if (!items.length || !value) return reply(req, 400, { error: 'bad_items' });
      const kg = slabKg(grams, packG);
      const d = await sr(`/courier/serviceability/?pickup_postcode=${from}&delivery_postcode=${pin}&weight=${kg}&cod=0&declared_value=${value}`).catch((e) => {
        if (/not serviceable|no courier/i.test(e.message)) return {}; throw e; });
      const c = quickest(d?.data?.available_courier_companies || []);
      if (!c) return reply(req, 200, { ok: false, reason: 'no_courier' });
      const fee = await feeFor(c.rate), id = crypto.randomUUID();
      await db('/rest/v1/ship_quotes', { id, pin, slab: kg, value, rate: c.rate, fee, courier_id: c.id, courier: c.name, days: c.days < 99 ? c.days : null, expires_at: new Date(Date.now() + 30 * 60e3).toISOString() });
      return reply(req, 200, { ok: true, quote: id, fee, kg, days: c.days < 99 ? c.days : null });
    }

    if (b.action === 'book') {
      if (!(await isOwner(req))) return reply(req, 403, { error: 'owner_only' });
      try { return reply(req, 200, await bookOrder(String(b.order_id || ''), b)); }
      catch (e) { if (e instanceof BookError) return reply(req, e.http, e.body); throw e; }
    }
    return reply(req, 400, { error: 'bad_request' });
  } catch (e) {
    console.error(e);
    return reply(req, 502, { error: 'shiprocket', message: (e as any).shown ? (e as Error).message : 'Shiprocket couldn’t be reached.' });
  }
}

if (typeof Deno !== 'undefined' && (Deno as any).serve) (Deno as any).serve(handle);
