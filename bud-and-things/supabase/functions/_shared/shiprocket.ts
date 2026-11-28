// Shiprocket helpers shared by the delivery and pay functions: the API client, picking the quickest courier, working out the
// shipping fee from a live rate, and booking a courier for a paid order (by the owner, or automatically after payment).
import { env, db, getOrder, setting, ORDER_ID } from './util.ts';

// Shiprocket wants the 10 digits for an Indian number (saved as +91…) and the plain digits for any other country
export const shipPhone = (v: unknown) => { const d = String(v || '').replace(/\D/g, ''); return d.startsWith('91') && d.length === 12 ? d.slice(2) : d; };

// a setting that is a switch: true, "true", "yes", "on" or 1 count as on
export const isOn = (v: unknown) => v === true || /^(true|yes|on|1)$/i.test(String(v ?? '').trim());

const API = 'https://apiv2.shiprocket.in/v1/external';
let token = '', tokenAt = 0;
export async function sr(path: string, body?: unknown, again = true): Promise<any> {
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
export const setShipment = (id: string, ship: unknown, status: string) => db('/rest/v1/rpc/set_shipment', { order_id: id, ship, new_status: status });

// ---------- live shipping rates ----------
// the weight band Shiprocket charges by: the cart plus its packing, in half kilos (the database works it out the same way)
export const slabKg = (grams: number, packG: number) => Math.max(Math.ceil((Math.round(grams) + packG) / 500) * 0.5, 0.5);

// the grams of one packed piece: the product's weight when it is a plain number, else the owner's default (the database
// reads it with the same rule, so the quote and the order agree on the weight band)
export const pieceGrams = (raw: unknown, pieceG: number) => (raw !== null && raw !== undefined && /^[0-9]{1,5}(\.[0-9]+)?$/.test(String(raw)) ? Math.round(Number(raw)) : pieceG);

// the quickest courier of those that can reach the PIN (fewest days; the cheaper one if two tie)
export function quickest(list: any[]) {
  const ok = (Array.isArray(list) ? list : []).map((c) => ({
    id: Number(c.courier_company_id) || null, name: String(c.courier_name || ''), rate: Number(c.rate), days: Number(c.estimated_delivery_days) || 99,
  })).filter((c) => c.rate > 0);
  ok.sort((a, b) => a.days - b.days || a.rate - b.rate);
  return ok[0] || null;
}
// what the customer is shown for a courier rate: rounded up to the owner's step (₹10), plus any buffer, kept between the
// owner's lowest and highest (0 = no highest)
export async function feeFor(rate: number) {
  const step = Math.max(Number(await setting('shipRound', 10)) || 10, 1), buffer = Math.max(Number(await setting('shipBuffer', 0)) || 0, 0);
  const lo = Math.max(Number(await setting('shipMin', 0)) || 0, 0), hi = Math.max(Number(await setting('shipMax', 0)) || 0, 0);
  let fee = Math.ceil(rate / step) * step + buffer;
  if (hi > 0) fee = Math.min(fee, hi);
  return Math.max(fee, lo);
}

// ---------- booking a courier ----------
export class BookError extends Error {
  http: number; body: Record<string, unknown>;
  constructor(http: number, body: Record<string, unknown>) { super('book ' + http); this.http = http; this.body = body; }
}

// Shiprocket order, AWB number, pickup request and label for a paid order. Safe to repeat: each step is skipped once done.
// b may carry weight, length, breadth, height and courier_id; otherwise the quote saved with the order picks the courier.
export async function bookOrder(id: string, b: Record<string, any> = {}) {
  id = String(id || '').toUpperCase();
  const o = ORDER_ID.test(id) && (await getOrder(id));
  if (!o) throw new BookError(404, { error: 'not_found' });
  if (!['Placed', 'Packed'].includes(o.status)) throw new BookError(409, { error: 'not_ready', status: o.status });
  const d = o.data, ship = { ...(d.parcel || {}) }; // data.ship is the shipping fee; the parcel is kept apart
  const num = (k: string, f: number) => { const v = Number(b[k]); return v > 0 && v < 1000 ? v : f; };
  const size = { weight: num('weight', Number(d.shipKg) || Number(await setting('parcelKg', 0.5)) || 0.5), length: num('length', Number(await setting('parcelL', 17)) || 17),
    breadth: num('breadth', Number(await setting('parcelB', 14)) || 14), height: num('height', Number(await setting('parcelH', 10)) || 10) };

  if (!ship.shipment) {
    // a gift goes to the person it's for, under their name and number
    const gift = d.gift && d.gift.on, who = String(gift ? d.gift.name : d.contact.name).trim(), sp = who.indexOf(' ');
    const placed = new Date(d.placedAt || o.created_at);
    const ist = new Date(placed.getTime() + 330 * 60e3).toISOString(); // Shiprocket reads dates in Indian time
    const made = await sr('/orders/create/adhoc', {
      order_id: id, order_date: ist.slice(0, 10) + ' ' + ist.slice(11, 16), pickup_location: String(await setting('shiprocketPickup', 'Primary')),
      billing_customer_name: sp > 0 ? who.slice(0, sp) : who, billing_last_name: sp > 0 ? who.slice(sp + 1) : '',
      billing_address: d.address.line1, billing_address_2: d.address.line2 || '', billing_city: d.address.city, billing_pincode: d.address.pin,
      billing_state: d.address.state, billing_country: 'India', billing_email: d.contact.email || '', billing_phone: shipPhone((gift && d.gift.phone) || d.contact.phone),
      shipping_is_billing: true,
      order_items: d.items.map((l: any) => ({ name: l.name + (l.label ? ' · ' + l.label : ''), sku: l.sku, units: l.qty, selling_price: l.price })),
      payment_method: o.method === 'Cash on delivery' ? 'COD' : 'Prepaid',
      shipping_charges: d.ship || 0, giftwrap_charges: d.wrap || 0, transaction_charges: d.cod || 0,
      total_discount: (d.ritual || 0) + (d.codeOff || 0), sub_total: d.sub, ...size });
    if (!made.shipment_id) throw new BookError(502, { error: 'shiprocket', message: made.message || 'Shiprocket didn’t make the shipment.' });
    Object.assign(ship, { srOrder: made.order_id, shipment: made.shipment_id, size });
    await setShipment(id, ship, '');
  }
  if (!ship.awb) {
    // the owner's pick, else the quickest courier chosen when the customer saw the shipping fee, else Shiprocket's own choice
    const want = Number(b.courier_id) || Number(d.shipQuote && d.shipQuote.courier_id) || 0;
    let a = await sr('/courier/assign/awb', { shipment_id: ship.shipment, ...(want ? { courier_id: want } : {}) }).catch((e) => (want ? null : Promise.reject(e)));
    if (want && !(a?.response?.data || {}).awb_code) a = await sr('/courier/assign/awb', { shipment_id: ship.shipment }); // that courier can't take it now
    const ad = a?.response?.data || {};
    if (!ad.awb_code) throw new BookError(502, { error: 'shiprocket', message: a?.message || ad.awb_assign_error || 'No courier took this parcel. Check the PIN code and wallet balance in Shiprocket.' });
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
  delete ship.autoErr; delete ship.autoErrAt;
  ship.booked = ship.booked || new Date().toISOString();
  const status = await setShipment(id, ship, 'Packed');
  return { status, ship };
}

// after a payment is confirmed: book the courier by itself when the owner has switched that on. Never throws: a failure is
// logged and kept on the order, and the owner's Book button works as before.
export async function autoBook(id: string) {
  try {
    if (!isOn(await setting('autoBook', false))) return null;
    return await bookOrder(id);
  } catch (e) {
    console.error('auto-book ' + id, e);
    try { const o = await getOrder(id); if (o) await setShipment(id, { ...((o.data && o.data.parcel) || {}), autoErr: String(e instanceof BookError ? (e.body.message || e.body.error) : (e as Error).message || e).slice(0, 200), autoErrAt: new Date().toISOString() }, ''); } catch { /* the log has it */ }
    return null;
  }
}
