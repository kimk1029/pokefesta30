import { NextResponse } from 'next/server';
import { fetchKreamSearch } from '@/lib/kream';

// KREAM 검색 SSR HTML 스크래핑을 서버에서 수행(클라이언트 CORS/안티봇 회피).
// lib 의 next.revalidate 로 쿼리당 캐시되어 KREAM 요청량을 줄인다.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ items: [] });
  const items = await fetchKreamSearch(q);
  return NextResponse.json({ items });
}
