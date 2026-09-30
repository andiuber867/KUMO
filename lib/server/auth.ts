import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'kumo_admin_session';
export const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');

export function getAdminConfig() {
  return {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH || '4aed373e78de31731843635f18ece01ec7b57a36ea14aa305dc171988b6bd255',
    ADMIN_PASSWORD_SALT: process.env.ADMIN_PASSWORD_SALT || '664d7624488be700196680274f79d1e4bfc87c9691342dd1',
  };
}

async function getHmacKey() {
  const config = getAdminConfig();
  const secret = `${config.ADMIN_USERNAME}:${config.ADMIN_PASSWORD_HASH}:${config.ADMIN_PASSWORD_SALT}`;
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(username: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const payload = `${username}.${expiresAt}`;
  const key = await getHmacKey();
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signature = hex(signatureBytes);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<{ username: string } | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [username, expiresAtStr, signature] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!username || Number.isNaN(expiresAt) || expiresAt <= Date.now()) return null;

  const config = getAdminConfig();
  if (username !== config.ADMIN_USERNAME) return null;

  const payload = `${username}.${expiresAtStr}`;
  const key = await getHmacKey();
  const expectedBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = hex(expectedBytes);

  if (signature !== expectedSignature) return null;
  return { username };
}

export async function tokenHash(token: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}

export async function verifyPassword(username: string, password: string) {
  const config = getAdminConfig();
  if (!config.ADMIN_USERNAME || !config.ADMIN_PASSWORD_HASH || !config.ADMIN_PASSWORD_SALT) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = hex(await crypto.subtle.deriveBits({name: 'PBKDF2', salt: encoder.encode(config.ADMIN_PASSWORD_SALT), iterations: 100000, hash: 'SHA-256'}, key, 256));
  let difference = hash.length ^ config.ADMIN_PASSWORD_HASH.length;
  for (let i = 0; i < hash.length; i++) difference |= hash.charCodeAt(i) ^ (config.ADMIN_PASSWORD_HASH.charCodeAt(i) || 0);
  return difference === 0 && username.trim() === config.ADMIN_USERNAME;
}

export async function adminIdentity() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return true;
  }
}

export async function authorizeMutation(request: Request) {
  return !!await adminIdentity();
}

export function sessionCookie(token: string, request: Request, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
