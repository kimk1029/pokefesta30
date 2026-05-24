import { NextResponse } from 'next/server';
import { fetchBunjangSearch } from '@/lib/bunjang';

// 로컬 Route Handler — next.config 의 /api/* → Express rewrite 보다 우선(afterFiles).
// 번개장터 비공식 API를 서버에서 호출해 CORS/UA 문제 없이 클라이언트에 전달.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ items: [], query: '', page: 0 });
  const pageRaw = Number(searchParams.get('page') ?? 0);
  const page = Number.isFinite(pageRaw) && pageRaw >= 0 ? Math.min(pageRaw, 50) : 0;
  const result = await fetchBunjangSearch(q, page, 40);
  return NextResponse.json(result);
}
