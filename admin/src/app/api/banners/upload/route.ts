import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob 미설정 — BLOB_READ_WRITE_TOKEN 환경변수를 추가하세요.' },
      { status: 503 },
    );
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid form' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no file' }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `지원하지 않는 형식: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '4MB 이하만 업로드 가능' }, { status: 400 });
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const pathname = `banner/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(file.type)}`;
    const { url } = await put(pathname, buf, { access: 'public', contentType: file.type });
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin.banners.upload]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
