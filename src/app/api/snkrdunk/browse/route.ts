import { NextResponse } from 'next/server';
import { fetchSnkrdunkBrowse } from '@/lib/snkrdunk';

export async function GET(req: Request) {
  const pageRaw = new URL(req.url).searchParams.get('page');
  const page = Math.max(1, Math.min(50, Number(pageRaw) || 1));
  const results = await fetchSnkrdunkBrowse(page);
  return NextResponse.json({ page, results });
}
