import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_BANNERS } from '@/lib/banners';

export const dynamic = 'force-dynamic';

/**
 * 기본 배너 채우기. DB 가 비어있을 때만 폴백 배너 4개를 시드한다.
 * 예전 db push(linkUrl 추가)가 실패했어도 동작하도록 컬럼을 먼저 보장한다.
 */
export async function POST() {
  try {
    // linkUrl 컬럼이 없으면 추가 (raw — Prisma 모델 컬럼에 의존하지 않음).
    await prisma.$executeRawUnsafe(
      'ALTER TABLE public.hero_banners ADD COLUMN IF NOT EXISTS "linkUrl" text',
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin.banners.seed.alter]', msg);
    return NextResponse.json(
      { error: `linkUrl 컬럼 준비 실패 (hero_banners 테이블이 없을 수 있음): ${msg}` },
      { status: 500 },
    );
  }

  try {
    const existing = await prisma.heroBanner.count();
    if (existing > 0) {
      return NextResponse.json({ created: 0, existing });
    }
    const result = await prisma.heroBanner.createMany({
      data: DEFAULT_BANNERS.map((b) => ({ ...b })),
    });
    return NextResponse.json({ created: result.count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin.banners.seed]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
