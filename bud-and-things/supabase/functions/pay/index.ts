// BUD & THINGS · online payment through Cashfree (a Supabase Edge Function).
//
// The browser never says how much to charge. It sends an order number; this function reads the total the database
// worked out (place_order in schema.sql), opens a Cashfree order for exactly that, and only marks the order paid once
// Cashfree itself says it is paid. Three kinds of call reach it:
//   { action: 'start', order_id, phone }  → a payment session for Cashfree's checkout on the page
//   { action: 'verify', order_id }        → after checkout (or the return from a bank page): asks Cashfree, records it
//   Cashfree's webhook, signed with the secret key, so a payment is recorded even if the customer closes the page
//
// Set up: see "Online payments (Cashfree)" in supabase/README.md.
import { env, dbReady, db, getOrder, setting, hmac, same, reply, cors, ORDER_ID } from '../_shared/util.ts';

// Saved numbers look like +919876543210 or +447911123456. Compare them as full digits (a bare 10-digit number is Indian).
const fullPhone = (v: unknown) => { const d = String(v || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };
// Cashfree wants the 10 digits for an Indian number and the plain digits for any other country
const gatewayPhone = (v: unknown) => { const d = fullPhone(v); return d.startsWith('91') && d.length === 12 ? d.slice(2) : d; };

const live = () => env('CASHFREE_ENV') === 'production';
const base = () => (live() ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');

async function cf(path: string, body?: unknown) {
  const r = await fetch(base() + path, { method: body === undefined ? 'GET' : 'POST', body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'x-client-id': env('CASHFREE_APP_ID'), 'x-client-secret': env('CASHFREE_SECRET_KEY'), 'x-api-version': '2023-08-01', 'Content-Type': 'application/json', Accept: 'application/json' } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('cashfree ' + r.status + ' ' + (d.message || JSON.stringify(d)));
  return d;
}
const markPaid = (id: string, pay: unknown) => db('/rest/v1/rpc/mark_paid', { order_id: id, pay });

// Cashfree says the order is paid, for the full amount: record it (once; repeats change nothing)
async function settle(o: { id: string; total: number }, cfo: any) {
  if (!cfo || cfo.order_status !== 'PAID' || Math.round(Number(cfo.order_amount) * 100) !== o.total * 100) return null;
  const pays = (await cf('/orders/' + encodeURIComponent(o.id) + '/payments')) || [];
  const p = (Array.isArray(pays) ? pays : []).find((x: any) => x.payment_status === 'SUCCESS') || {};
  return markPaid(o.id, { by: 'cashfree', payment: p.cf_payment_id ? String(p.cf_payment_id) : null, method: p.payment_group || null, at: new Date().toISOString() });
}

export async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'post_only' });
  if (!env('CASHFREE_APP_ID') || !env('CASHFREE_SECRET_KEY') || !dbReady()) return reply(req, 503, { error: 'payments_not_set_up' });
  const raw = await req.text();

  try {
    // Cashfree's webhook: trusted only when its signature matches (timestamp + body, signed with the secret key)
    const sig = req.headers.get('x-webhook-signature');
    if (sig) {
      const ts = req.headers.get('x-webhook-timestamp') || '';
      if (!same(await hmac(env('CASHFREE_SECRET_KEY'), ts + raw, 'base64'), sig)) return reply(req, 401, { error: 'bad_signature' });
      const ev = JSON.parse(raw), id = String(ev?.data?.order?.order_id || '');
      if (ev.type === 'PAYMENT_SUCCESS_WEBHOOK' && ORDER_ID.test(id)) {
        const o = await getOrder(id);
        // check with Cashfree too, so only a payment it holds for the full amount counts
        if (o) await settle(o, await cf('/orders/' + encodeURIComponent(id)));
      }
      return reply(req, 200, { ok: true });
    }

    let b: Record<string, string>;
    try { b = JSON.parse(raw); } catch { return reply(req, 400, { error: 'bad_request' }); }
    const id = String(b.order_id || '').toUpperCase().trim();
    if (!ORDER_ID.test(id)) return reply(req, 400, { error: 'bad_order' });
    const o = await getOrder(id);

    if (b.action === 'start') {
      // the order number and the mobile it was placed with, like the order lookup
      if (!o || fullPhone(o.phone) !== fullPhone(b.phone)) return reply(req, 404, { error: 'not_found' });
      if (o.status !== 'Awaiting payment') return reply(req, 409, { error: 'not_awaiting', status: o.status });
      let cfo = await cf('/orders/' + encodeURIComponent(id));
      if (cfo && cfo.order_status === 'PAID') return reply(req, 200, { status: await settle(o, cfo) });
      if (!cfo) {
        // the payment link lapses when the pieces stop being held for this order (payHoldMins), and never in under 20 minutes
        const hold = Math.max(Number(await setting('payHoldMins', 120)) || 120, 5);
        const until = new Date(Math.max(new Date(o.created_at).getTime() + hold * 60e3, Date.now() + 20 * 60e3));
        const site = env('SITE_URL').replace(/\/+$/, '');
        const c = o.data?.contact || {};
        cfo = await cf('/orders', { order_id: id, order_amount: o.total, order_currency: 'INR',
          customer_details: { customer_id: 'c' + fullPhone(o.phone), customer_phone: gatewayPhone(o.phone), customer_name: String(c.name || '').slice(0, 80) || undefined, customer_email: c.email || undefined },
          order_meta: { return_url: site ? site + '/?paid={order_id}#order-' + id : undefined, notify_url: env('SUPABASE_URL') + '/functions/v1/pay' },
          order_expiry_time: until.toISOString(), order_note: 'BUD & THINGS order ' + id });
      }
      if (!cfo || cfo.order_status !== 'ACTIVE' || !cfo.payment_session_id) return reply(req, 409, { error: 'not_payable', status: cfo && cfo.order_status });
      return reply(req, 200, { session: cfo.payment_session_id, mode: live() ? 'production' : 'sandbox' });
    }
    if (b.action === 'verify') {
      if (!o) return reply(req, 404, { error: 'not_found' });
      if (o.data?.payment) return reply(req, 200, { status: o.status, paid: true });
      const status = await settle(o, await cf('/orders/' + encodeURIComponent(id)));
      return reply(req, 200, status ? { status, paid: true } : { status: o.status, paid: false });
    }
    return reply(req, 400, { error: 'bad_request' });
  } catch (e) {
    console.error(e);
    return reply(req, 502, { error: 'payment_service' });
  }
}

if (typeof Deno !== 'undefined' && (Deno as any).serve) (Deno as any).serve(handle);
