// BUD & THINGS · delivery through Shiprocket (a Supabase Edge Function).
//
//   { action: 'pin', pin }               → can a courier reach this PIN code, and in how many days (any visitor,
//                                          30 checks an hour each)
//   { action: 'book', order_id, ... }    → the owner books the courier for a paid order: Shiprocket order, AWB number,
//                                          pickup request and shipping label, all in one go (owner only)
//   Shiprocket's tracking webhook, with the token set in Shiprocket → Settings → API → Webhooks, moves the order to
//   Shipped and Delivered on its own.
//
// Set up: see "Delivery (Shiprocket)" in supabase/README.md.
import { env, dbReady, db, getOrder, setting, allowed, isOwner, same, reply, cors, ORDER_ID } from '../_shared/util.ts';

const API = 'https://apiv2.shiprocket.in/v1/external';
let token = '', tokenAt = 0;
async function sr(path: string, body?: unknown, again = true): Promise<any> {
  if (!token || Date.now() - tokenAt > 8 * 864e5) { // a sign-in lasts 10 days
    const r = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env('SHIPROCKET_EMAIL'), password: env('SHIPROCKET_PASSWORD') }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.token) throw new Error('shiprocket sign-in: ' + (d.message || r.status));
    token = d.token; tokenAt = Date.now();
  }
  const r = await fetch(API + path, { method: body === undefined ? 'GET' : 'POST', body: body === undefined ? undefined : JSON.stringify(body),
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } });
  if (r.status === 401 && again) { token = ''; return sr(path, body, false); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.message || ('Shiprocket said ' + r.status)); (e as any).shown = true; throw e; }
  return d;
}
const setShipment = (id: string, ship: unknown, status: string) => db('/rest/v1/rpc/set_shipment', { order_id: id, ship, new_status: status });

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

    if (b.action === 'book') {
      if (!(await isOwner(req))) return reply(req, 403, { error: 'owner_only' });
      const id = String(b.order_id || '').toUpperCase();
      const o = ORDER_ID.test(id) && (await getOrder(id));
      if (!o) return reply(req, 404, { error: 'not_found' });
      if (!['Placed', 'Packed'].includes(o.status)) return reply(req, 409, { error: 'not_ready', status: o.status });
      const d = o.data, ship = { ...(d.parcel || {}) }; // data.ship is the shipping fee; the parcel is kept apart
      const num = (k: string, f: number) => { const v = Number(b[k]); return v > 0 && v < 1000 ? v : f; };
      const size = { weight: num('weight', Number(await setting('parcelKg', 0.5)) || 0.5), length: num('length', Number(await setting('parcelL', 20)) || 20),
        breadth: num('breadth', Number(await setting('parcelB', 15)) || 15), height: num('height', Number(await setting('parcelH', 10)) || 10) };

      if (!ship.shipment) {
        // a gift goes to the person it's for, under their name and number
        const gift = d.gift && d.gift.on, who = String(gift ? d.gift.name : d.contact.name).trim(), sp = who.indexOf(' ');
        const placed = new Date(d.placedAt || o.created_at);
        const ist = new Date(placed.getTime() + 330 * 60e3).toISOString(); // Shiprocket reads dates in Indian time
        const made = await sr('/orders/create/adhoc', {
          order_id: id, order_date: ist.slice(0, 10) + ' ' + ist.slice(11, 16), pickup_location: String(await setting('shiprocketPickup', 'Primary')),
          billing_customer_name: sp > 0 ? who.slice(0, sp) : who, billing_last_name: sp > 0 ? who.slice(sp + 1) : '',
          billing_address: d.address.line1, billing_address_2: d.address.line2 || '', billing_city: d.address.city, billing_pincode: d.address.pin,
          billing_state: d.address.state, billing_country: 'India', billing_email: d.contact.email || '', billing_phone: (gift && d.gift.phone) || d.contact.phone,
          shipping_is_billing: true,
          order_items: d.items.map((l: any) => ({ name: l.name + (l.label ? ' · ' + l.label : ''), sku: l.sku, units: l.qty, selling_price: l.price })),
          payment_method: o.method === 'Cash on delivery' ? 'COD' : 'Prepaid',
          shipping_charges: d.ship || 0, giftwrap_charges: d.wrap || 0, transaction_charges: d.cod || 0,
          total_discount: (d.ritual || 0) + (d.codeOff || 0), sub_total: d.sub, ...size });
        if (!made.shipment_id) return reply(req, 502, { error: 'shiprocket', message: made.message || 'Shiprocket didn’t make the shipment.' });
        Object.assign(ship, { srOrder: made.order_id, shipment: made.shipment_id, size });
        await setShipment(id, ship, '');
      }
      if (!ship.awb) {
        const a = await sr('/courier/assign/awb', { shipment_id: ship.shipment, ...(b.courier_id ? { courier_id: b.courier_id } : {}) });
        const ad = a?.response?.data || {};
        if (!ad.awb_code) return reply(req, 502, { error: 'shiprocket', message: a.message || ad.awb_assign_error || 'No courier took this parcel. Check the PIN code and wallet balance in Shiprocket.' });
        Object.assign(ship, { awb: ad.awb_code, courier: ad.courier_name || null, track: 'https://shiprocket.co/tracking/' + ad.awb_code });
        await setShipment(id, ship, '');
      }
      if (!ship.pickup) {
        await sr('/courier/generate/pickup', { shipment_id: [ship.shipment] }).then((p) => { ship.pickup = p?.response?.pickup_scheduled_date || true; }, (e) => {
          if (/already/i.test(e.message)) ship.pickup = true; else ship.pickupErr = e.message; });
      }
      if (!ship.label) {
        await sr('/courier/generate/label', { shipment_id: [ship.shipment] }).then((l) => { if (l.label_url) ship.label = l.label_url; }, () => { /* the label can be printed from Shiprocket too */ });
      }
      ship.booked = ship.booked || new Date().toISOString();
      const status = await setShipment(id, ship, 'Packed');
      return reply(req, 200, { status, ship });
    }
    return reply(req, 400, { error: 'bad_request' });
  } catch (e) {
    console.error(e);
    return reply(req, 502, { error: 'shiprocket', message: (e as any).shown ? (e as Error).message : 'Shiprocket couldn’t be reached.' });
  }
}

if (typeof Deno !== 'undefined' && (Deno as any).serve) (Deno as any).serve(handle);
