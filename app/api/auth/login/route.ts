import { sameOrigin, verifyPassword, sessionCookie, getAdminConfig, createSessionToken } from '@/lib/server/auth';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:'Solicitud no permitida.'}, {status:403});
  const config = getAdminConfig();
  if (!config.ADMIN_PASSWORD_HASH || !config.ADMIN_PASSWORD_SALT || !config.ADMIN_USERNAME) return Response.json({error:'El acceso de administración aún no está configurado.'}, {status:503});
  try {
    const input = await request.json() as {username?:unknown;password?:unknown};
    if (typeof input.username !== 'string' || typeof input.password !== 'string' || input.username.length > 100 || input.password.length > 256) return Response.json({error:'Usuario o contraseña incorrectos.'}, {status:400});
    if (!await verifyPassword(input.username.trim(), input.password)) return Response.json({error:'Usuario o contraseña incorrectos.'}, {status:401});
    const token = await createSessionToken(config.ADMIN_USERNAME);
    return Response.json({ok:true}, {headers:{'Set-Cookie':sessionCookie(token,request),'Cache-Control':'no-store'}});
  } catch (error) {
    console.error('admin login unavailable', error);
    return Response.json({error:'No pudimos iniciar sesión. Intenta nuevamente.'}, {status:503});
  }
}
