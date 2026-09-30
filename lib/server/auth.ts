import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { database } from './database';

export const SESSION_COOKIE = 'kumo_admin_session';
export const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');

export async function tokenHash(token: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}

export async function verifyPassword(username: string, password: string) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH || !env.ADMIN_PASSWORD_SALT) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = hex(await crypto.subtle.deriveBits({name: 'PBKDF2', salt: encoder.encode(env.ADMIN_PASSWORD_SALT), iterations: 100000, hash: 'SHA-256'}, key, 256));
  let difference = hash.length ^ env.ADMIN_PASSWORD_HASH.length;
  for (let i = 0; i < hash.length; i++) difference |= hash.charCodeAt(i) ^ (env.ADMIN_PASSWORD_HASH.charCodeAt(i) || 0);
  return difference === 0 && username === env.ADMIN_USERNAME;
}

export async function adminIdentity() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await database().prepare('SELECT username, credential_version FROM admin_sessions WHERE token_hash = ? AND expires_at > ?').bind(await tokenHash(token), Date.now()).first<{username:string;credential_version:string}>();
  // Changing the configured password invalidates every previous session.
  if (!session || session.username !== env.ADMIN_USERNAME || session.credential_version !== await tokenHash(env.ADMIN_PASSWORD_HASH || '')) return null;
  return {username: session.username};
}

export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

export async function authorizeMutation(request: Request) {
  return sameOrigin(request) && !!await adminIdentity();
}

export function sessionCookie(token: string, request: Request, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
