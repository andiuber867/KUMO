import { database } from '@/lib/server/database';
import { sameOrigin, verifyPassword, tokenHash, sessionCookie, SESSION_SECONDS, getAdminConfig } from '@/lib/server/auth';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:'Solicitud no permitida.'}, {status:403});
  const config = getAdminConfig();
  if (!config.ADMIN_PASSWORD_HASH || !config.ADMIN_PASSWORD_SALT || !config.ADMIN_USERNAME) return Response.json({error:'El acceso de administración aún no está configurado.'}, {status:503});
  try {
    const input = await request.json() as {username?:unknown;password?:unknown};
    if (typeof input.username !== 'string' || typeof input.password !== 'string' || input.username.length > 100 || input.password.length > 256) return Response.json({error:'Usuario o contraseña incorrectos.'}, {status:400});
    const db = database();
    const now = Date.now();
    // Reserve attempts atomically before checking the password, including concurrent requests.
    const bucket = 'admin:' + Math.floor(now / (15 * 60 * 1000));
    const limit = await db.prepare('INSERT INTO login_limits (key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(bucket, now + 30*60*1000).first<{attempts:number}>();
    if (!limit || limit.attempts > 10) return Response.json({error:'Demasiados intentos. Intenta nuevamente en 15 minutos.'}, {status:429, headers:{'Retry-After':'900'}});
    if (!await verifyPassword(input.username.trim(), input.password)) return Response.json({error:'Usuario o contraseña incorrectos.'}, {status:401});
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join('');
    await db.batch([
      db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now),
      db.prepare('DELETE FROM login_limits WHERE expires_at <= ?').bind(now),
      db.prepare('DELETE FROM login_limits WHERE key = ?').bind(bucket),
      db.prepare('INSERT INTO admin_sessions (token_hash, username, credential_version, expires_at) VALUES (?, ?, ?, ?)').bind(await tokenHash(token), config.ADMIN_USERNAME, await tokenHash(config.ADMIN_PASSWORD_HASH), now + SESSION_SECONDS*1000),
    ]);
    return Response.json({ok:true}, {headers:{'Set-Cookie':sessionCookie(token,request),'Cache-Control':'no-store'}});
  } catch (error) {
    console.error('admin login unavailable', error);
    return Response.json({error:'No pudimos iniciar sesión. Intenta nuevamente.'}, {status:503});
  }
}
