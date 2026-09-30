import { adminIdentity } from '@/lib/server/auth';
import { getChatGPTUser,chatGPTSignInPath } from '@/app/chatgpt-auth';
import { AdminPanel } from '@/features/admin/admin-panel';
import { Brand } from '@/components/brand';
export const dynamic='force-dynamic';
export default async function Admin(){const admin=await adminIdentity();if(admin)return <AdminPanel email={admin.email}/>;const user=await getChatGPTUser();return <main className="login-page"><Brand/><div className="eyebrow">ESPACIO KUMO</div><h1>Tu carta,<br/><em>en tus manos.</em></h1><p>{user?'Esta cuenta no está habilitada para administrar la carta. Usa el correo autorizado del restaurante.':'Ingresa con la cuenta autorizada para gestionar los productos de KUMO.'}</p>{!user?<a className="primary-button" href={chatGPTSignInPath('/admin')} target="_top">Ingresar con ChatGPT</a>:<a className="outline-button" href="/signout-with-chatgpt?return_to=/admin" target="_top">Cambiar de cuenta</a>}<a className="back-link" href="/">Volver a la carta</a></main>}
