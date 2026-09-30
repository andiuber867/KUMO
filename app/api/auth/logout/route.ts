import { cookies } from 'next/headers';
import { database } from '@/lib/server/database';
import { SESSION_COOKIE, sameOrigin, tokenHash, sessionCookie } from '@/lib/server/auth';
export async function POST(request:Request) {
  if (!sameOrigin(request)) return Response.json({error:'Solicitud no permitida.'},{status:403});
  try {
    const token=(await cookies()).get(SESSION_COOKIE)?.value;
    if(token) await database().prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await tokenHash(token)).run();
    return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie('',request,0),'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'No se pudo cerrar la sesión. Vuelve a intentarlo.'},{status:503}); }
}
