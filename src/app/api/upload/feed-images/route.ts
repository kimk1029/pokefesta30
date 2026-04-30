import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 피드 첨부 사진 업로드.
 *  - multipart/form-data: files[] (최대 3장 — 거래보다 적게)
 *  - 로그인 필수
 *  - @vercel/blob put() 으로 public 업로드 → URL 반환
 *  - 클라이언트가 이미 압축해서 보내는 전제 (~200KB/장 목표)
 */

const MAX_FILES = 3;
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob 이 설정되지 않았습니다. Vercel → Storage → Blob store 생성 후 프로젝트 연결 필요.' },
      { status: 503 },
    );
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid form data' }, { status: 400 });
  }

  const files = fd.getAll('files').filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'no files' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `최대 ${MAX_FILES}장까지 업로드 가능` }, { status: 400 });
  }

  const urls: string[] = [];
  try {
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: `지원하지 않는 형식: ${file.type}` }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `파일이 너무 큽니다 (${Math.round(file.size / 1024)}KB) — 4MB 이하로 압축하세요` },
          { status: 400 },
        );
      }
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const pathname = `feed/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { url } = await put(pathname, file, {
        access: 'public',
        contentType: file.type,
      });
      urls.push(url);
    }
    return NextResponse.json({ urls });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[upload.feed-images]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
