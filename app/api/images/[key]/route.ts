export async function GET(_request:Request,{params}:{params:Promise<{key:string}>}){
  return new Response('Not found', { status: 404 });
}
