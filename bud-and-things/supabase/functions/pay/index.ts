// BUD & THINGS · online payment through Razorpay (a Supabase Edge Function).
//
// The browser never says how much to charge. It sends an order number; this function reads the total the database
// worked out (place_order in schema.sql), opens a Razorpay order for exactly that, and only marks the order paid once
// Razorpay itself says it is paid. Three kinds of call reach it:
//   { action: 'start', order_id, phone }  → the details Razorpay's checkout needs on the page
//   { action: 'verify', order_id }        → after checkout (or the return from a bank page): asks Razorpay, records it
//   Razorpay's webhook, signed with the webhook secret, so a payment is recorded even if the customer closes the page
//
// Set up: see "Online payments (Razorpay)" in supabase/README.md.
import { env, dbReady, db, getOrder, hmac, same, reply, cors, ORDER_ID, allowed } from '../_shared/util.ts';

// Saved numbers look like +919876543210 or +447911123456. Compare them as full digits (a bare 10-digit number is Indian).
const fullPhone = (v: unknown) => { const d = String(v || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };

// test keys start rzp_test_, live keys rzp_live_
const live = () => env('RAZORPAY_KEY_ID').startsWith('rzp_live_');

async function rzp(path: string, body?: unknown) {
  const r = await fetch('https://api.razorpay.com/v1' + path, { method: body === undefined ? 'GET' : 'POST', body: body === undefined ? undefined : JSON.stringify(body),
    headers: { Authorization: 'Basic ' + btoa(env('RAZORPAY_KEY_ID') + ':' + env('RAZORPAY_KEY_SECRET')), 'Content-Type': 'application/json', Accept: 'application/json' } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('razorpay ' + r.status + ' ' + (d?.error?.description || JSON.stringify(d)));
  return d;
}
const markPaid = (id: string, pay: unknown) => db('/rest/v1/rpc/mark_paid', { order_id: id, pay });

// Razorpay's order for this shop order (we use the shop order number as the receipt); null when none is open yet
async function rzpOrder(id: string) {
  const list = await rzp('/orders?receipt=' + encodeURIComponent(id) + '&count=10');
  const items: any[] = Array.isArray(list?.items) ? list.items : [];
  return items.find((x) => x.receipt === id && x.status !== 'paid') || items.find((x) => x.receipt === id) || null;
}

// Razorpay says the order is paid, for the full amount: record it (once; repeats change nothing)
async function settle(o: { id: string; total: number }, ro: any) {
  if (!ro || ro.status !== 'paid' || Number(ro.amount_paid) !== o.total * 100) return null;
  const pays = (await rzp('/orders/' + encodeURIComponent(ro.id) + '/payments'))?.items || [];
  const p = (Array.isArray(pays) ? pays : []).find((x: any) => x.status === 'captured') || {};
  return markPaid(o.id, { by: 'razorpay', payment: p.id ? String(p.id) : null, method: p.method || null, at: new Date().toISOString() });
}

export async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'post_only' });
  if (!env('RAZORPAY_KEY_ID') || !env('RAZORPAY_KEY_SECRET') || !dbReady()) return reply(req, 503, { error: 'payments_not_set_up' });
  const raw = await req.text();

  try {
    // Razorpay's webhook: trusted only when its signature matches (the body, signed with the webhook secret)
    const sig = req.headers.get('x-razorpay-signature');
    if (sig) {
      if (!env('RAZORPAY_WEBHOOK_SECRET') || !same(await hmac(env('RAZORPAY_WEBHOOK_SECRET'), raw, 'hex'), sig)) return reply(req, 401, { error: 'bad_signature' });
      const ev = JSON.parse(raw);
      const ent = ev?.payload?.order?.entity || {};
      const id = String(ent.receipt || '');
      if ((ev.event === 'order.paid' || ev.event === 'payment.captured') && ORDER_ID.test(id)) {
        const o = await getOrder(id);
        // check with Razorpay too, so only a payment it holds for the full amount counts
        if (o) await settle(o, await rzpOrder(id));
      }
      return reply(req, 200, { ok: true });
    }

    let b: Record<string, string>;
    try { b = JSON.parse(raw); } catch { return reply(req, 400, { error: 'bad_request' }); }
    const id = String(b.order_id || '').toUpperCase().trim();
    if (!ORDER_ID.test(id)) return reply(req, 400, { error: 'bad_order' });
    // browsers only: per visitor, so a bot can't open Razorpay orders or guess order numbers (Razorpay's webhook is exempt above)
    if (b.action === 'start' && !(await allowed(req, 'pay-start', 20, '1 hour'))) return reply(req, 429, { error: 'too_many_requests' });
    if (b.action === 'verify' && !(await allowed(req, 'pay-verify', 120, '1 hour'))) return reply(req, 429, { error: 'too_many_requests' });
    const o = await getOrder(id);

    if (b.action === 'start') {
      // the order number and the mobile it was placed with, like the order lookup
      if (!o || fullPhone(o.phone) !== fullPhone(b.phone)) return reply(req, 404, { error: 'not_found' });
      if (o.status !== 'Awaiting payment') return reply(req, 409, { error: 'not_awaiting', status: o.status });
      let ro = await rzpOrder(id);
      if (ro && ro.status === 'paid') return reply(req, 200, { status: await settle(o, ro) });
      // a Razorpay order cannot change amount, so a stale one for a different total is not reused
      if (ro && Number(ro.amount) !== o.total * 100) ro = null;
      if (!ro) ro = await rzp('/orders', { amount: o.total * 100, currency: 'INR', receipt: id, notes: { order: id } });
      if (!ro || !ro.id) return reply(req, 409, { error: 'not_payable', status: ro && ro.status });
      return reply(req, 200, { key: env('RAZORPAY_KEY_ID'), razorpay_order: ro.id, amount: ro.amount, mode: live() ? 'production' : 'sandbox' });
    }
    if (b.action === 'verify') {
      if (!o) return reply(req, 404, { error: 'not_found' });
      if (o.data?.payment) return reply(req, 200, { status: o.status, paid: true });
      const status = await settle(o, await rzpOrder(id));
      return reply(req, 200, status ? { status, paid: true } : { status: o.status, paid: false });
    }
    return reply(req, 400, { error: 'bad_request' });
  } catch (e) {
    console.error(e);
    return reply(req, 502, { error: 'payment_service' });
  }
}

if (typeof Deno !== 'undefined' && (Deno as any).serve) (Deno as any).serve(handle);
