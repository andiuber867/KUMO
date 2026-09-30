import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export async function adminIdentity(){const user=await getChatGPTUser();const allowed=(env.ADMIN_EMAIL||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);return user&&allowed.includes(user.email.toLowerCase())?user:null;}
export async function authorizeMutation(request:Request){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return false;return !!await adminIdentity();}
