// BUD & THINGS · messages to customers and the owner (a Supabase Edge Function).
//
// The database queues a message whenever something happens (order confirmed, shipped, delivered, a restock, a gift
// date coming up…; see "messages" in schema.sql). This function sends what is queued, once, and reports back.
//   { action: 'run' }     send what is queued (called every minute by the schedule in supabase/README.md)
//   { action: 'daily' }   queue gift-date reminders, then send (called once a day)
// Both need the header  x-notify-token: <NOTIFY_TOKEN>, so only the schedule can start a send.
//
// Email goes through Resend (RESEND_API_KEY). WhatsApp, SMS and app push are wired to the same queue but only send
// once a provider is set up (WHATSAPP_URL / SMS_URL / PUSH_URL below); until then those messages are given up
// quietly and the email still goes. Set up: see "Messages to customers" in supabase/README.md.
import { env, dbReady, db, setting, same, reply, cors } from '../_shared/util.ts';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const inr = (n: unknown) => '₹' + Number(n || 0).toLocaleString('en-IN');
const OCC: Record<string, string> = { birthday: 'birthday', anniversary: 'anniversary', housewarming: 'housewarming', wedding: 'wedding', 'new-baby': 'new baby', 'thank-you': 'thank you', festive: 'festive gift', milestone: 'milestone', 'self-care': 'self-care gift', 'just-because': 'gift' };

type Note = { id: string; event: string; channel: string; recipient: string; order_id: string | null; data: any; order: any; name: string | null };
type Msg = { subject: string; lines: string[]; button?: [string, string]; short: string; extra?: string; attach?: { filename: string; content: string } };

// what each happening says; `short` is the one-line version for SMS, WhatsApp and push
function compose(n: Note, site: string, shop: string): Msg | null {
  const o = n.order || {}, first = String(n.name || '').split(' ')[0] || 'there', id = n.order_id || '';
  const link = site ? site + '/#order-' + id : '';
  const items = (o.items || []).map((l: any) => `${l.name}${l.label ? ' · ' + l.label : ''} × ${l.qty}`);
  const track = o.parcel && o.parcel.awb ? `${o.parcel.courier || 'Courier'}, tracking number ${o.parcel.awb}` : '';
  const trackLink = o.parcel && o.parcel.track ? [`Track your parcel`, o.parcel.track] as [string, string] : undefined;
  switch (n.event) {
    case 'welcome': return { subject: 'Welcome to BUD & THINGS', lines: [`Hello ${first}, welcome.`, 'Your account keeps your orders, saved addresses and Bud Points in one place, so checking out takes a minute.', 'We make small-batch candles and Jesmonite pieces by hand. Take your time.'], button: site ? ['Have a look around', site + '/#shop'] : undefined, short: 'Welcome to BUD & THINGS. Your account is ready.' };
    case 'confirmed': return { subject: `We have your order ${id}`, lines: [`Thank you, ${first}. Order ${id} is confirmed.`, ...items, `Total: ${inr(o.total)}`, o.gift && o.gift.on ? `It is a gift for ${o.gift.name}.` : '', 'We pack by hand, usually within 1 to 3 working days, and email you when it ships.'], button: link ? ['See your order', link] : undefined, short: `BUD & THINGS: order ${id} is confirmed (${inr(o.total)}). We'll message you when it ships.` };
    case 'shipped': return { subject: `Your order ${id} is on its way`, lines: [`Good news, ${first}: your order is on its way.`, track, 'It usually arrives within a few days of shipping.'].filter(Boolean), button: trackLink || (link ? ['See your order', link] : undefined), short: `BUD & THINGS: order ${id} has shipped${track ? ' with ' + track : ''}.${o.parcel && o.parcel.track ? ' Track: ' + o.parcel.track : ''}` };
    case 'delivered': return { subject: `Your order ${id} has arrived`, lines: [`${first}, your order has been delivered.`, o.points ? `${o.points} Bud Points have been added to your account.` : '', 'To get the most from a candle, trim the wick to 5 mm before each burn and let the first burn melt the whole top.', 'If anything is not right, just reply to this email.'].filter(Boolean), button: site ? ['Leave a review', site + '/#account'] : undefined, short: `BUD & THINGS: order ${id} was delivered. Enjoy!` };
    case 'delayed': { const dl = o.delay || {}; const until = dl.until ? new Date(dl.until + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : '';
      return { subject: `Your order ${id} is running a little late`, lines: [`${first}, we are sorry: order ${id} is running a little late.`, dl.reason ? `Why: ${dl.reason}${dl.note ? '. ' + dl.note : ''}` : '', until ? `We now expect it to reach you by ${until}.` : 'We will email you as soon as it moves.', `Questions? Reply to this email or write to ${shop}.`].filter(Boolean), button: link ? ['See your order', link] : undefined, short: `BUD & THINGS: order ${id} is running late${until ? ', now expected by ' + until : ''}.` }; }
    case 'cancelled': return { subject: `Your order ${id} was cancelled`, lines: [`${first}, order ${id} has been cancelled.`, o.method === 'Online' && o.payment ? 'Any payment you made will be refunded to the original method within 5 to 7 working days.' : 'Nothing was charged.', `Questions? Reply to this email or write to ${shop}.`], short: `BUD & THINGS: order ${id} was cancelled.` };
    case 'refund': return { subject: `Your payment for ${id} is being refunded`, lines: [`${first}, your payment reached us after the pieces in order ${id} had been released, so we could not go ahead.`, 'We are refunding the full amount to you; it reaches you in 5 to 7 working days.'], short: `BUD & THINGS: we are refunding your payment for ${id}.` };
    case 'review_ask': return { subject: 'How are you finding it?', lines: [`Hello ${first}, it has been a week since your order ${id} arrived.`, 'If you have a minute, tell others what you think. Every review is read by Ashi, good or bad.', ...items], button: site ? ['Write a review', site + (n.data && n.data.product ? '/#p-' + encodeURIComponent(n.data.product) : '/#account')] : undefined, short: `BUD & THINGS: how are you finding your order ${id}? We would love a review.` };
    case 'restock': return { subject: 'It is back in stock', lines: ['A piece you asked about is back in stock. Small batches go quickly.'], button: site ? ['See what is back', site + '/#shop'] : undefined, short: 'BUD & THINGS: a piece you asked about is back in stock.' };
    case 'reminder': return { subject: `A ${OCC[n.data.occasion] || 'gift'} is coming up${n.data.for ? ' for ' + n.data.for : ''}`, lines: [`You asked us to remind you: the ${OCC[n.data.occasion] || 'gift'} date${n.data.for ? ' for ' + n.data.for : ''} is on ${new Date(n.data.day + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}.`, 'Order this week and there is time to wrap it by hand.'], button: site ? ['Find a gift', site + '/#gifting'] : undefined, short: `BUD & THINGS: your ${OCC[n.data.occasion] || 'gift'} reminder is on ${n.data.day}.` };
    // to the shop's own inbox
    case 'new_order': return { subject: `New order ${id} · ${inr(o.total)}`, lines: [`${o.contact?.name || ''} (${o.contact?.phone || ''}) ordered:`, ...items, `Total ${inr(o.total)} · ${o.method || ''}`, o.gift && o.gift.on ? `Gift for ${o.gift.name}${o.gift.wrap ? ', wrap it' : ''}${o.gift.date ? ', by ' + o.gift.date : ''}.` : '', `Deliver to ${[o.address?.line1, o.address?.city, o.address?.pin].filter(Boolean).join(', ')}.`], button: site ? ['Open Owner view', site + '/#admin'] : undefined, short: `New order ${id}` };
    case 'low_review': { const d = n.data || {}; return { subject: `A ${d.rating}-star review is waiting`, lines: [`${d.name || 'Someone'} gave ${d.product || 'a piece'} ${d.rating} star${d.rating === 1 ? '' : 's'}:`, `“${d.body || ''}”`, 'It is not on the site until you publish it. A quick, kind reply often turns this around.'], button: site ? ['Open Reviews', site + '/#admin'] : undefined, short: `New ${d.rating}-star review` }; }
    case 'weekly': { const d = n.data || {}; return { subject: `Your week: ${d.orders || 0} order${d.orders === 1 ? '' : 's'}, ${inr(d.revenue)}`, lines: [`Orders: ${d.orders || 0}, worth ${inr(d.revenue)}.`, `Visitors: ${d.visitors || 0}. New sign-ups: ${d.signups || 0}.`, d.reviews ? `${d.reviews} review${d.reviews === 1 ? ' is' : 's are'} waiting for you to read.` : '', d.lowStock ? `${d.lowStock} option${d.lowStock === 1 ? ' is' : 's are'} down to the last 1 or 2.` : ''].filter(Boolean), button: site ? ['Open Analytics', site + '/#admin'] : undefined, short: 'Your weekly BUD & THINGS summary' }; }
    case 'refund_due': return { subject: `Refund needed: ${id}`, lines: [`A payment for ${id} arrived after the order was released. Refund it in the Cashfree dashboard.`], button: site ? ['Open Owner view', site + '/#admin'] : undefined, short: `Refund needed for ${id}` };
  }
  return null;
}


// the invoice made for an order (amounts are in paise); null when there is none, so the email just goes without it
const rs = (p: unknown) => '₹' + (Number(p || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
async function invoiceFor(orderId: string) {
  const r = await db('/rest/v1/invoices?select=id,kind,data&status=eq.Issued&kind=eq.invoice&order_id=eq.' + encodeURIComponent(orderId) + '&limit=1');
  return r && r[0] ? r[0] : null;
}
// one table that reads in any inbox; the same markup is the attached file
function invoiceTable(inv: any) {
  const d = inv.data, gst = d.gst, t = d.totals, sl = d.seller, b = d.buyer, td = 'padding:6px 8px;border-bottom:1px solid #e6dccb;font-size:13px';
  const head = gst ? ['Item', 'HSN', 'Qty', 'Taxable', 'Rate'].concat(d.inter ? ['IGST'] : ['CGST', 'SGST'], ['Amount']) : ['Item', 'Qty', 'Price', 'Discount', 'Amount'];
  const row = (l: any) => '<tr>' + (gst
    ? [l.name, l.hsn || '', l.qty, rs(l.taxable), l.rate + '%'].concat(d.inter ? [rs(l.igst)] : [rs(l.cgst), rs(l.sgst)], [rs(l.net)])
    : [l.name, l.qty, rs(Math.round(l.gross / l.qty)), l.disc ? '−' + rs(l.disc) : '—', rs(l.net)]).map((c, i) => `<td style="${td};${i ? 'text-align:right' : ''}">${esc(c)}</td>`).join('') + '</tr>';
  const sum = (a: string, v: string, bold = false) => `<tr><td colspan="${head.length - 1}" style="${td};text-align:right${bold ? ';font-weight:bold' : ''}">${a}</td><td style="${td};text-align:right${bold ? ';font-weight:bold' : ''}">${v}</td></tr>`;
  const date = d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return `<p style="margin:0 0 4px;font-size:16px"><strong>${gst ? 'Tax invoice' : 'Bill of supply'} ${esc(inv.id)}</strong></p>
<p style="margin:0 0 12px;font-size:13px;line-height:1.5">${esc(sl.name)}${sl.address ? ', ' + esc(sl.address) : ''}${sl.gstin ? '<br>GSTIN: ' + esc(sl.gstin) : ''}<br>Date: ${esc(date)} · Order ${esc(d.orderId)}<br>Billed to: ${esc(b.name)}</p>
<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>${head.map((h, i) => `<th style="${td};text-align:${i ? 'right' : 'left'}">${h}</th>`).join('')}</tr></thead><tbody>${d.lines.map(row).join('')}
${gst ? sum('Taxable value', rs(t.taxable)) + (d.inter ? sum('IGST', rs(t.igst)) : sum('CGST', rs(t.cgst)) + sum('SGST', rs(t.sgst))) : ''}${sum('Total', rs(t.total), true)}</tbody></table></div>
<p style="margin:10px 0 0;font-size:12px;color:#6B705C">${gst ? 'Prices include GST.' : 'Issued by a supplier not registered under GST. No tax is charged.'}</p>`;
}
const attachment = (inv: any) => ({ filename: String(inv.id).replace(/[^A-Za-z0-9-]/g, '-') + '.html',
  content: btoa(String.fromCharCode(...new TextEncoder().encode(`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(inv.id)}</title></head><body style="margin:0;padding:24px;font-family:Arial,sans-serif;color:#2b1d14;max-width:820px">${invoiceTable(inv)}</body></html>`))) });

// the page: ivory paper, chocolate text, terracotta button (the brand palette), plain enough for any inbox
function html(m: Msg, site: string, tail: string) {
  const body = m.lines.filter(Boolean).map((l, i) => `<p style="margin:0 0 14px;font-size:${i ? 15 : 17}px;line-height:1.6">${esc(l)}</p>`).join('');
  const btn = m.button ? `<p style="margin:24px 0"><a href="${esc(m.button[1])}" style="background:#A55B3F;color:#F8F0E4;text-decoration:none;padding:12px 22px;display:inline-block;font-size:14px;letter-spacing:.04em">${esc(m.button[0])}</a></p>` : '';
  return `<div style="background:#F8F0E4;padding:28px 12px"><div style="max-width:520px;margin:0 auto;background:#fff;padding:32px 28px;font-family:Georgia,'Times New Roman',serif;color:#3D281E">
<p style="margin:0 0 22px;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#6B705C">BUD &amp; THINGS</p>${body}${m.extra ? `<div style="margin:20px 0 0;border-top:1px solid #e6dccb;padding-top:16px">${m.extra}</div>` : ''}${btn}
<p style="margin:28px 0 0;font-size:12px;color:#6B705C;line-height:1.5">${esc(tail)}${site ? ` <a href="${esc(site)}" style="color:#6B705C">${esc(site.replace(/^https?:\/\//, ''))}</a>` : ''}</p></div></div>`;
}

async function sendEmail(to: string, m: Msg, site: string, from: string, replyTo: string, tail: string) {
  if (!env('RESEND_API_KEY')) throw new Error('no_provider:email');
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env('RESEND_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject: m.subject, html: html(m, site, tail), ...(m.attach ? { attachments: [m.attach] } : {}), text: m.lines.filter(Boolean).join('\n\n') + (m.button ? '\n\n' + m.button[1] : '') }) });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 300));
}
// SMS, WhatsApp and push: one JSON call to whatever the provider adapter is (a small function or the provider's own
// API). { channel, to, text, event, order_id }. Not set up → no_provider, which the queue gives up on without retrying.
async function sendOther(n: Note, m: Msg) {
  const url = env({ sms: 'SMS_URL', whatsapp: 'WHATSAPP_URL', push: 'PUSH_URL' }[n.channel] as string);
  if (!url) throw new Error('no_provider:' + n.channel);
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env('PROVIDER_TOKEN') },
    body: JSON.stringify({ channel: n.channel, to: n.recipient, text: m.short, event: n.event, order_id: n.order_id, subject: m.subject }) });
  if (!r.ok) throw new Error(n.channel + ' ' + r.status + ' ' + (await r.text()).slice(0, 300));
}

export async function sendQueued(limit = 30) {
  const site = env('SITE_URL').replace(/\/+$/, ''), shop = String(await setting('email', 'hello@budandthings.com'));
  const from = env('NOTIFY_FROM') || `BUD & THINGS <${shop}>`, tail = 'You are getting this because of an order or account on BUD & THINGS. Reply to this email any time.';
  const notes: Note[] = (await db('/rest/v1/rpc/claim_notes', { n: limit })) || [];
  let sent = 0, failed = 0;
  for (const n of notes) {
    let err = '', giveUp = false;
    try {
      const m = compose(n, site, shop);
      if (m && n.event === 'confirmed' && n.channel === 'email' && n.order_id && (await setting('invoiceEmail', true)) !== false) {
        try { const inv = await invoiceFor(n.order_id); if (inv) { m.extra = invoiceTable(inv); m.attach = attachment(inv); m.lines.push('Your invoice ' + inv.id + ' is below and attached.'); } } catch (e) { console.error('invoice_email', e); }
      }
      if (!m) { err = 'unknown_event'; giveUp = true; } else if (n.channel === 'email') await sendEmail(n.recipient, m, site, from, shop, tail); else await sendOther(n, m);
    } catch (e) { err = String((e as Error).message || e); giveUp = /^no_provider/.test(err) || /resend 4(00|01|03|22)/.test(err); }
    await db('/rest/v1/rpc/finish_note', { note_id: n.id, ok: !err, err, give_up: giveUp });
    if (err) failed++; else sent++;
  }
  return { claimed: notes.length, sent, failed };
}

export async function handle(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'post_only' });
  if (!env('NOTIFY_TOKEN') || !dbReady()) return reply(req, 503, { error: 'notify_not_set_up' });
  if (!same(req.headers.get('x-notify-token') || '', env('NOTIFY_TOKEN'))) return reply(req, 401, { error: 'bad_token' });
  try {
    const b = await req.json().catch(() => ({}));
    const queued = b.action === 'daily' ? await db('/rest/v1/rpc/queue_reminders', {}) : 0;
    return reply(req, 200, { ...(await sendQueued()), reminders: queued });
  } catch (e) { console.error(e); return reply(req, 502, { error: 'notify_failed' }); }
}

if (typeof Deno !== 'undefined' && (Deno as any).serve) (Deno as any).serve(handle);
