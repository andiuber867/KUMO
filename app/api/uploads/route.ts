import { authorizeMutation } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  if (!await authorizeMutation(request)) return Response.json({ error: 'Acceso no autorizado.' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024) return Response.json({ error: 'La foto debe pesar menos de 5 MB.' }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !file.size) return Response.json({ error: 'Selecciona una foto de hasta 5 MB.' }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
    const webp = new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
    const ext = jpg ? 'jpeg' : png ? 'png' : webp ? 'webp' : null;
    if (!ext) return Response.json({ error: 'Usa una imagen JPG, PNG o WebP.' }, { status: 400 });
    const base64 = Buffer.from(bytes).toString('base64');
    const url = `data:image/${ext};base64,${base64}`;
    return Response.json({ url });
  } catch (e) {
    console.error('upload', e);
    return Response.json({ error: 'No se pudo procesar la foto. Intenta nuevamente.' }, { status: 503 });
  }
}
