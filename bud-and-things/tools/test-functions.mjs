// Tests for the Edge Functions (pay, delivery) with the database, Razorpay and Shiprocket replaced by in-memory stand-ins.
// Run through test-functions.js (needs Node 22.6 or newer). No network and no real keys are used.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const ENV = { SUPABASE_URL: 'http://db.test', SUPABASE_SERVICE_ROLE_KEY: 'svc', RAZORPAY_KEY_ID: 'rzp_test_dummy', RAZORPAY_KEY_SECRET: 'zzsecret',
  RAZORPAY_WEBHOOK_SECRET: 'hooksecret', SHIPROCKET_EMAIL: 'a@b.test', SHIPROCKET_PASSWORD: 'dummy', SHIPROCKET_WEBHOOK_TOKEN: 'tok' };
globalThis.Deno = { env: { get: (k) => ENV[k] } };

let order, rzpItems, paidCalls, shipCalls;
globalThis.fetch = async (url, opts = {}) => {
  url = String(url); const body = opts.body ? JSON.parse(opts.body) : null, json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
  if (url.includes('/rest/v1/rpc/hit')) return json(null);
  if (url.includes('/rest/v1/rpc/is_owner')) return json((opts.headers.Authorization || '') === 'Bearer owner-token');
  if (url.includes('/rest/v1/rpc/mark_paid')) { paidCalls.push(body); return json('Placed'); }
  if (url.includes('/rest/v1/rpc/set_shipment')) { shipCalls.push(body); return json(body.new_status || 'Placed'); }
  if (url.includes('/rest/v1/orders?select=id,status')) return json(order ? [order] : []);
  if (url.includes('/rest/v1/orders?select=id&data->parcel')) return json([]);
  if (url.includes('api.razorpay.com/v1/orders?receipt=')) return json({ items: rzpItems });
  if (url.includes('api.razorpay.com/v1/orders/') && url.endsWith('/payments')) return json({ items: [{ id: 'pay_1', status: 'captured', method: 'upi' }] });
  if (url.includes('api.razorpay.com/v1/orders') && opts.method === 'POST') return json({ id: 'order_new', amount: body.amount, receipt: body.receipt, status: 'created' });
  throw new Error('unexpected fetch ' + url);
};
const reset = () => { order = { id: 'BT-1-ABCDEF', status: 'Awaiting payment', total: 500, phone: '+919876543210', data: {} }; rzpItems = []; paidCalls = []; shipCalls = []; };
const post = (obj, headers = {}, raw) => new Request('http://fn.test', { method: 'POST', headers: { 'x-real-ip': '1.2.3.4', ...headers }, body: raw ?? JSON.stringify(obj) });
const sign = (raw) => crypto.createHmac('sha256', ENV.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
const ok = (m) => console.log('ok   ' + m);

const pay = (await import('../supabase/functions/pay/index.ts')).handle;
const delivery = (await import('../supabase/functions/delivery/index.ts')).handle;
const hook = JSON.stringify({ event: 'order.paid', payload: { order: { entity: { receipt: 'BT-1-ABCDEF' } } } });

// ----- pay
reset(); assert.equal((await pay(post(null, {}, 'not json'))).status, 400); ok('pay: unreadable body is refused');
reset(); assert.equal((await pay(post({ action: 'start', order_id: 'nope', phone: '1' }))).status, 400); ok('pay: a bad order number is refused');
reset(); assert.equal((await pay(post(null, { 'x-razorpay-signature': 'bad' }, hook))).status, 401); assert.equal(paidCalls.length, 0); ok('pay: webhook with a wrong signature is refused and records nothing');
reset(); rzpItems = [{ id: 'order_1', receipt: 'BT-1-ABCDEF', status: 'paid', amount: 50000, amount_paid: 40000 }];
assert.equal((await pay(post(null, { 'x-razorpay-signature': sign(hook) }, hook))).status, 200); assert.equal(paidCalls.length, 0); ok('pay: a payment for less than the total is not recorded');
reset(); rzpItems = [{ id: 'order_1', receipt: 'BT-1-ABCDEF', status: 'paid', amount: 50000, amount_paid: 50000 }];
assert.equal((await pay(post(null, { 'x-razorpay-signature': sign(hook) }, hook))).status, 200); assert.equal(paidCalls.length, 1); assert.equal(paidCalls[0].pay.payment, 'pay_1'); ok('pay: a full, signed, Razorpay-confirmed payment is recorded once');
reset(); assert.equal((await pay(post({ action: 'start', order_id: 'BT-1-ABCDEF', phone: '9000000000' }))).status, 404); ok('pay: start with the wrong mobile number is refused');
reset(); order.status = 'Placed'; assert.equal((await pay(post({ action: 'start', order_id: 'BT-1-ABCDEF', phone: '9876543210' }))).status, 409); ok('pay: start on an order that is not awaiting payment is refused');
reset(); { const r = await pay(post({ action: 'start', order_id: 'BT-1-ABCDEF', phone: '9876543210' })); const d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.amount, 50000); assert.equal(d.mode, 'sandbox'); assert.ok(!('secret' in d) && !JSON.stringify(d).includes('zzsecret')); ok('pay: start charges exactly the database total and leaks no secret'); }
reset(); { const r = await pay(post({ action: 'verify', order_id: 'BT-1-ABCDEF' })); assert.equal((await r.json()).paid, false); assert.equal(paidCalls.length, 0); ok('pay: verify with nothing paid at Razorpay records nothing'); }

// ----- delivery
reset(); assert.equal((await delivery(post({ action: 'pin', pin: '12' }))).status, 400); ok('delivery: a bad PIN code is refused');
reset(); assert.equal((await delivery(post({ action: 'book', order_id: 'BT-1-ABCDEF' }))).status, 403); ok('delivery: booking a courier needs the owner');
reset(); assert.equal((await delivery(post({ action: 'book', order_id: 'BT-1-ABCDEF' }, { authorization: 'Bearer someone-else' }))).status, 403); ok('delivery: booking with another sign-in is refused');
reset(); order.status = 'Awaiting payment'; assert.equal((await delivery(post({ action: 'book', order_id: 'BT-1-ABCDEF' }, { authorization: 'Bearer owner-token' }))).status, 409); ok('delivery: an unpaid order cannot be booked');
reset(); assert.equal((await delivery(post({}, { 'x-api-key': 'wrong' }, '{}'))).status, 401); ok('delivery: tracking webhook with a wrong token is refused');
reset(); assert.equal((await delivery(post({}, { 'x-api-key': 'tok' }, JSON.stringify({ awb: 'AWB123456', current_status: 'DELIVERED' })))).status, 200); ok('delivery: tracking webhook with the right token is accepted');
console.log('Function checks passed.');
