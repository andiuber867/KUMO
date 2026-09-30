import { readCatalog,saveProduct } from '@/features/products/repository';

import { productInput } from '@/features/products/validation';
import { authorizeMutation } from '@/lib/server/auth';
export async function GET(){try{const c=await readCatalog();return Response.json({products:c.products},{headers:{'Cache-Control':'no-store'}})}catch(e){console.error('catalog read',e);return Response.json({error:'La carta no está disponible temporalmente.'},{status:503})}}
export async function POST(request:Request){if(!await authorizeMutation(request))return Response.json({error:'Acceso no autorizado.'},{status:403});try{const parsed=productInput.safeParse(await request.json());if(!parsed.success)return Response.json({error:'Revisa el nombre, la categoría y el precio del producto.'},{status:400});const id=crypto.randomUUID();await saveProduct(id,parsed.data,true);return Response.json({id},{status:201})}catch(e){console.error('product create',e);return Response.json({error:'No se pudo guardar. Vuelve a intentarlo.'},{status:503})}}
