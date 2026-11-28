// Tests for the Edge Functions (pay, delivery) with the database, Razorpay and Shiprocket replaced by in-memory stand-ins.
// Run through test-functions.js (needs Node 22.6 or newer). No network and no real keys are used.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const ENV = { SUPABASE_URL: 'http://db.test', SUPABASE_SERVICE_ROLE_KEY: 'svc', RAZORPAY_KEY_ID: 'rzp_test_dummy', RAZORPAY_KEY_SECRET: 'zzsecret',
  RAZORPAY_WEBHOOK_SECRET: 'hooksecret', SHIPROCKET_EMAIL: 'a@b.test', SHIPROCKET_PASSWORD: 'dummy', SHIPROCKET_WEBHOOK_TOKEN: 'tok' };
globalThis.Deno = { env: { get: (k) => ENV[k] } };

let order, rzpItems, paidCalls, shipCalls, SETTINGS, PRODUCTS, quotes, srCalls, COURIERS, assignFails;
globalThis.fetch = async (url, opts = {}) => {
  url = String(url); const body = opts.body ? JSON.parse(opts.body) : null, json = (d, s = 200) => new Response(JSON.stringify(d), { status: s });
  if (url.includes('/rest/v1/rpc/hit')) return json(null);
  if (url.includes('/rest/v1/rpc/is_owner')) return json((opts.headers.Authorization || '') === 'Bearer owner-token');
  if (url.includes('/rest/v1/rpc/mark_paid')) { paidCalls.push(body); if (order) order.status = 'Placed'; return json('Placed'); }
  if (url.includes('/rest/v1/rpc/set_shipment')) { shipCalls.push(body); if (order) { order.data = { ...order.data, parcel: body.ship }; if (body.new_status) order.status = body.new_status; } return json(body.new_status || 'Placed'); }
  if (url.includes('/rest/v1/settings?select=value')) { const k = decodeURIComponent(url.split('key=eq.')[1]); return json(k in SETTINGS ? [{ value: SETTINGS[k] }] : []); }
  if (url.includes('/rest/v1/products?select=data')) return json(PRODUCTS);
  if (url.endsWith('/rest/v1/ship_quotes') && opts.method === 'POST') { quotes.push(body); return new Response('', { status: 201 }); }
  if (url.includes('apiv2.shiprocket.in')) {
    const path = url.split('/v1/external')[1]; srCalls.push({ path, body });
    if (path === '/auth/login') return json({ token: 'srtoken' });
    if (path.startsWith('/courier/serviceability/')) return json({ data: { available_courier_companies: COURIERS } });
    if (path === '/orders/create/adhoc') return json({ shipment_id: 77, order_id: 55 });
    if (path === '/courier/assign/awb') return assignFails && (body.courier_id || assignFails === 'all') ? json({ message: 'no', response: { data: {} } }) : json({ response: { data: { awb_code: 'AWB900', courier_name: body.courier_id ? 'Fast courier' : 'Default courier' } } });
    if (path === '/courier/generate/pickup') return json({ response: { pickup_scheduled_date: '2026-11-24' } });
    if (path === '/courier/generate/label') return json({ label_url: 'https://label.test/1.pdf' });
  }
  if (url.includes('/rest/v1/orders?select=id,status')) return json(order ? [order] : []);
  if (url.includes('/rest/v1/orders?select=id&data->parcel')) return json([]);
  if (url.includes('api.razorpay.com/v1/orders?receipt=')) return json({ items: rzpItems });
  if (url.includes('api.razorpay.com/v1/orders/') && url.endsWith('/payments')) return json({ items: [{ id: 'pay_1', status: 'captured', method: 'upi' }] });
  if (url.includes('api.razorpay.com/v1/orders') && opts.method === 'POST') return json({ id: 'order_new', amount: body.amount, receipt: body.receipt, status: 'created' });
  throw new Error('unexpected fetch ' + url);
};
const reset = () => { SETTINGS = {}; PRODUCTS = []; quotes = []; srCalls = []; assignFails = false; COURIERS = []; order = { id: 'BT-1-ABCDEF', status: 'Awaiting payment', total: 500, phone: '+919876543210', data: {} }; rzpItems = []; paidCalls = []; shipCalls = []; };
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
reset(); rzpItems = [{ id: 'order_open', receipt: 'BT-1-ABCDEF', status: 'created', amount: 50000, amount_paid: 0 }, { id: 'order_1', receipt: 'BT-1-ABCDEF', status: 'paid', amount: 50000, amount_paid: 50000 }]; { const r = await pay(post({ action: 'verify', order_id: 'BT-1-ABCDEF' })); assert.equal((await r.json()).paid, true); assert.equal(paidCalls.length, 1); ok('pay: two Razorpay orders for one shop order, the paid one is the one that counts'); }

// ----- delivery
reset(); assert.equal((await delivery(post({ action: 'pin', pin: '12' }))).status, 400); ok('delivery: a bad PIN code is refused');
reset(); assert.equal((await delivery(post({ action: 'book', order_id: 'BT-1-ABCDEF' }))).status, 403); ok('delivery: booking a courier needs the owner');
reset(); assert.equal((await delivery(post({ action: 'book', order_id: 'BT-1-ABCDEF' }, { authorization: 'Bearer someone-else' }))).status, 403); ok('delivery: booking with another sign-in is refused');
reset(); order.status = 'Awaiting payment'; assert.equal((await delivery(post({ action: 'book', order_id: 'BT-1-ABCDEF' }, { authorization: 'Bearer owner-token' }))).status, 409); ok('delivery: an unpaid order cannot be booked');
reset(); assert.equal((await delivery(post({}, { 'x-api-key': 'wrong' }, '{}'))).status, 401); ok('delivery: tracking webhook with a wrong token is refused');
reset(); assert.equal((await delivery(post({}, { 'x-api-key': 'tok' }, JSON.stringify({ awb: 'AWB123456', current_status: 'DELIVERED' })))).status, 200); ok('delivery: tracking webhook with the right token is accepted');

// ----- delivery: live shipping quote (the quickest courier's rate)
const quote = (body) => delivery(post({ action: 'quote', pin: '208024', ...body }));
const live = () => { SETTINGS = { shipAuto: true, pickupPin: '201318', packG: 100, pieceG: 300 }; PRODUCTS = [{ data: { variants: [{ sku: 'A', price: 499 }], weight: 220 } }, { data: { variants: [{ sku: 'B', price: 299 }] } }];
  COURIERS = [{ courier_company_id: 1, courier_name: 'Slow and cheap', rate: 80, estimated_delivery_days: '5' }, { courier_company_id: 2, courier_name: 'Fast', rate: 94.02, estimated_delivery_days: '2' }, { courier_company_id: 3, courier_name: 'Fast and dear', rate: 120, estimated_delivery_days: '2' }]; };
reset(); { const r = await quote({ items: [{ sku: 'A', qty: 1 }] }); assert.deepEqual(await r.json(), { ok: false, reason: 'off' }); ok('quote: nothing happens while live shipping is switched off'); }
reset(); live(); assert.equal((await quote({ pin: '12', items: [{ sku: 'A', qty: 1 }] })).status, 400); assert.equal((await quote({ items: [] })).status, 400);
assert.equal((await quote({ items: [{ sku: 'NOPE', qty: 1 }] })).status, 400); assert.equal((await quote({ items: [{ sku: 'A', qty: 0 }] })).status, 400); assert.equal((await quote({ items: [{ sku: 'A', qty: 1.5 }] })).status, 400); ok('quote: a bad PIN, an empty cart, an unknown piece and a bad quantity are refused');
reset(); live(); { const r = await quote({ items: [{ sku: 'A', qty: 1 }] }), d = await r.json(), call = srCalls.find((c) => c.path.startsWith('/courier/serviceability/'));
  assert.equal(r.status, 200); assert.equal(d.ok, true); assert.equal(d.fee, 100); assert.equal(d.kg, 0.5); assert.equal(d.days, 2);
  assert.ok(call.path.includes('weight=0.5') && call.path.includes('declared_value=499') && call.path.includes('pickup_postcode=201318') && call.path.includes('delivery_postcode=208024'));
  assert.equal(quotes.length, 1); const q = quotes[0]; assert.equal(q.id, d.quote); assert.equal(q.courier_id, 2); assert.equal(q.rate, 94.02); assert.equal(q.fee, 100); assert.equal(q.value, 499); assert.equal(q.slab, 0.5); assert.equal(q.pin, '208024');
  const mins = (new Date(q.expires_at) - Date.now()) / 60000; assert.ok(mins > 28 && mins <= 30);
  ok('quote: picks the quickest courier (the cheaper of two that tie), rounds the fee up to Rs 10 and saves it for 30 minutes'); }
reset(); live(); { const d = await (await quote({ items: [{ sku: 'A', qty: 2 }] })).json(); assert.equal(d.kg, 1); assert.equal(quotes[0].value, 998); ok('quote: two pieces weigh 540 g with packing, so the 1 kg band'); }
reset(); live(); { const d = await (await quote({ items: [{ sku: 'B', qty: 1 }] })).json(); assert.equal(d.kg, 0.5); const w = await (await quote({ items: [{ sku: 'B', qty: 2 }] })).json(); assert.equal(w.kg, 1); ok('quote: a piece with no weight uses the default per piece (300 g)'); }
reset(); live(); SETTINGS.shipMax = 90; { const d = await (await quote({ items: [{ sku: 'A', qty: 1 }] })).json(); assert.equal(d.fee, 90); SETTINGS.shipMax = 0; SETTINGS.shipMin = 150; assert.equal((await (await quote({ items: [{ sku: 'A', qty: 1 }] })).json()).fee, 150); ok('quote: the owner can keep the fee between a lowest and a highest amount'); }
reset(); live(); SETTINGS.shipBuffer = 5; { assert.equal((await (await quote({ items: [{ sku: 'A', qty: 1 }] })).json()).fee, 105); ok('quote: a buffer is added after rounding'); }
reset(); live(); COURIERS = []; { const d = await (await quote({ items: [{ sku: 'A', qty: 1 }] })).json(); assert.equal(d.ok, false); assert.equal(quotes.length, 0); ok('quote: no courier for the PIN means no quote'); }

// ----- pay: automatic courier booking once a payment is confirmed
const paidOrder = () => { order.status = 'Awaiting payment'; order.method = 'Online'; order.created_at = '2026-11-22T06:00:00Z'; order.data = { placedAt: '2026-11-22T06:00:00Z', contact: { name: 'Asha Rao', phone: '+919876543210', email: 'a@b.test' }, address: { line1: '1 Road', city: 'Kanpur', pin: '208024', state: 'Uttar Pradesh' },
  items: [{ sku: 'A', name: 'Berry Blast', label: 'Large', qty: 1, price: 499 }], sub: 499, ship: 100, wrap: 0, cod: 0, ritual: 0, codeOff: 0, shipKg: 0.5, shipQuote: { id: 'q1', courier_id: 2, courier: 'Fast', days: 2, rate: 94.02 } }; rzpItems = [{ id: 'order_1', receipt: 'BT-1-ABCDEF', status: 'paid', amount: 50000, amount_paid: 50000 }]; };
const pays = () => pay(post(null, { 'x-razorpay-signature': sign(hook) }, hook));
reset(); paidOrder(); await pays(); assert.equal(paidCalls.length, 1); assert.equal(srCalls.length, 0); ok('auto-book: off by default, a paid order waits for the owner to book it');
reset(); paidOrder(); SETTINGS.autoBook = true; order.data.items = [{ sku: 'T', name: 'Midnight Sunflower · Pack of 6', label: 'Pack of 6', qty: 1, price: 149 }, { sku: 'A', name: 'Berry Blast', label: 'Large', qty: 1, price: 499 }]; { await pays(); const o = srCalls.find((c) => c.path === '/orders/create/adhoc'); assert.deepEqual(o.body.order_items.map((x) => x.name), ['Midnight Sunflower · Pack of 6', 'Berry Blast · Large']); ok('book: an option label already in the product name is not printed twice'); }
reset(); paidOrder(); SETTINGS.autoBook = true; { assert.equal((await pays()).status, 200); const a = srCalls.find((c) => c.path === '/courier/assign/awb'), o = srCalls.find((c) => c.path === '/orders/create/adhoc');
  assert.equal(a.body.courier_id, 2); assert.equal(o.body.shipping_charges, 100); assert.equal(o.body.weight, 0.5); assert.equal(o.body.payment_method, 'Prepaid');
  assert.ok(srCalls.some((c) => c.path === '/courier/generate/pickup') && srCalls.some((c) => c.path === '/courier/generate/label'));
  const last = shipCalls[shipCalls.length - 1]; assert.equal(last.new_status, 'Packed'); assert.equal(last.ship.awb, 'AWB900'); assert.equal(last.ship.courier, 'Fast courier'); assert.ok(last.ship.booked);
  ok('auto-book: on, the confirmed payment books the quickest courier from the quote, with pickup and label'); }
reset(); paidOrder(); SETTINGS.autoBook = 'true'; delete order.data.shipQuote; await pays(); { const a = srCalls.find((c) => c.path === '/courier/assign/awb'); assert.ok(a && !('courier_id' in a.body)); ok('auto-book: an order without a quote lets Shiprocket choose the courier'); }
reset(); paidOrder(); SETTINGS.autoBook = true; assignFails = true; await pays(); { const calls = srCalls.filter((c) => c.path === '/courier/assign/awb'); assert.equal(calls.length, 2); assert.equal(calls[0].body.courier_id, 2); assert.ok(!('courier_id' in calls[1].body)); assert.equal(shipCalls[shipCalls.length - 1].ship.awb, 'AWB900'); ok('auto-book: if the quoted courier cannot take it any more, Shiprocket picks another'); }
reset(); paidOrder(); SETTINGS.autoBook = true; assignFails = 'all'; { const r = await pays(); assert.equal(r.status, 200); assert.equal(paidCalls.length, 1); const last = shipCalls[shipCalls.length - 1]; assert.ok(last.ship.autoErr); ok('auto-book: a booking that fails never undoes the payment, and the reason is kept on the order'); }
reset(); paidOrder(); SETTINGS.autoBook = true; order.data.payment = { by: 'razorpay' }; await pays(); assert.equal(srCalls.length, 0); ok('auto-book: a payment that was already recorded does not book again');
reset(); paidOrder(); SETTINGS.autoBook = true; order.data.parcel = { shipment: 77, awb: 'AWB1', pickup: true, label: 'x' }; { const r = await delivery(post({ action: 'book', order_id: 'BT-1-ABCDEF' }, { authorization: 'Bearer owner-token' })); order.status = 'Placed'; assert.equal(srCalls.filter((c) => c.path === '/orders/create/adhoc').length, 0); ok('book: the owner\'s Book button still works and skips the steps already done'); }

console.log('Function checks passed.');
