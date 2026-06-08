import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBannerInput } from '@/lib/banners';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const banners = await prisma.heroBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return NextResponse.json({ banners });
  } catch (err) {
    console.error('[admin.banners.GET]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const v = parseBannerInput(body, false);
  if (v.ok === false) return NextResponse.json({ error: v.error }, { status: 400 });
  try {
    const banner = await prisma.heroBanner.create({
      data: {
        sortOrder: v.data.sortOrder ?? 0,
        slideClass: v.data.slideClass!,
        badge: v.data.badge!,
        title: v.data.title!,
        sub: v.data.sub!,
        ctaHint: v.data.ctaHint ?? null,
        visualType: v.data.visualType ?? 'emoji',
        visualValue: v.data.visualValue ?? '✨',
        onClick: v.data.onClick ?? null,
        linkUrl: v.data.linkUrl ?? null,
        active: v.data.active ?? true,
      },
    });
    return NextResponse.json({ banner }, { status: 201 });
  } catch (err) {
    console.error('[admin.banners.POST]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
