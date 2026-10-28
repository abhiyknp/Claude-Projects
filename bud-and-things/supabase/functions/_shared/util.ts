// Helpers shared by the pay and delivery functions: settings from the environment, the database with the service
// key, and replies the shop's pages are allowed to read.

export const env = (k: string) => (Deno.env.get(k) || '').trim();
const DB = () => env('SUPABASE_URL'), SERVICE = () => env('SUPABASE_SERVICE_ROLE_KEY');
export const dbReady = () => !!(DB() && SERVICE());

// the database as the service (row rules don't apply), so keep every call here narrow
export async function db(path: string, body?: unknown) {
  const r = await fetch(DB() + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: SERVICE(), Authorization: 'Bearer ' + SERVICE(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) { const e = new Error('db ' + r.status + ' ' + t); (e as any).body = t; throw e; }
  return t ? JSON.parse(t) : null;
}
export const getOrder = async (id: string) =>
  (await db('/rest/v1/orders?select=id,status,total,phone,method,created_at,data&id=eq.' + encodeURIComponent(id)))[0];
// a value from the shop's settings table, or the fallback
export async function setting(key: string, fallback: unknown) {
  const row = (await db('/rest/v1/settings?select=value&key=eq.' + encodeURIComponent(key)))[0];
  return row && row.value !== null && row.value !== '' ? row.value : fallback;
}
// counts one try for this visitor; false once there have been max in the window (the same limits as the database's)
export async function allowed(req: Request, bucket: string, max: number, per: string) {
  const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0]).trim() || 'unknown';
  const who = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip)))].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
  try { await db('/rest/v1/rpc/hit', { b: bucket, w: who, max_n: max, per }); return true; } catch (e) { if (/too_many/.test(String(e))) return false; throw e; }
}
// is the caller signed in as the owner? (their sign-in token, checked by the database's own is_owner())
export async function isOwner(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer .+/.test(auth)) return false;
  const r = await fetch(DB() + '/rest/v1/rpc/is_owner', { method: 'POST', headers: { apikey: env('SUPABASE_ANON_KEY') || SERVICE(), Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  return r.ok && (await r.json()) === true;
}

const enc = new TextEncoder();
export async function hmac(secret: string, text: string, as: 'hex' | 'base64' = 'hex') {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const b = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(text)));
  return as === 'hex' ? [...b].map((x) => x.toString(16).padStart(2, '0')).join('') : btoa(String.fromCharCode(...b));
}
// compares in constant time, so a signature can't be guessed a character at a time
export function same(a: string, b: string) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// the shop's own pages may call these functions (SITE_ORIGINS, space separated; any origin while it's empty)
export function cors(req: Request) {
  const list = env('SITE_ORIGINS').split(/[\s,]+/).filter(Boolean), o = req.headers.get('origin') || '';
  return { 'Access-Control-Allow-Origin': !list.length ? '*' : list.includes(o) ? o : list[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
}
export const reply = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
export const ORDER_ID = /^BT-\d+-[0-9A-F]{6}$/;
