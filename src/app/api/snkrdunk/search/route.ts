import { NextResponse } from 'next/server';
import { fetchSnkrdunkSearch } from '@/lib/snkrdunk';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ results: [] });
  const results = await fetchSnkrdunkSearch(q);
  return NextResponse.json({ results });
}
