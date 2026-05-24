import { NextResponse } from 'next/server';
import { fetchMvcAuctionPage } from '@/lib/navercafe';

// 로컬 Route Handler — next.config 의 /api/* → Express rewrite 보다 우선(afterFiles).
// MVC 경매 게시판 글을 페이지 단위로 반환 (무한스크롤용, 필터 없이 전부).
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pageRaw = Number(searchParams.get('page') ?? 1);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 50) : 1;
  const result = await fetchMvcAuctionPage(page);
  return NextResponse.json(result);
}
