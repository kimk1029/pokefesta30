import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseCardStatics } from '../../../../../../shared/cardStatics';

export const dynamic = 'force-dynamic';
// 카탈로그 전체 재파싱 — 행 수에 따라 수십 초 걸릴 수 있음.
export const maxDuration = 300;

/**
 * 카탈로그 전체 행을 최신 파서로 재파싱 — 게임 구분 + 세트코드/카드번호 백필.
 * 파싱 성공 값만 채우고, 기존 값을 null 로 덮지 않는다.
 */
export async function POST() {
  try {
    const rows = await prisma.snkrdunkCard.findMany({
      select: {
        apparelId: true,
        name: true,
        localizedName: true,
        productNumber: true,
        game: true,
        setCode: true,
        cardNumber: true,
        rarity: true,
      },
    });

    let updated = 0;
    let stillMissing = 0;
    for (const r of rows) {
      const statics = parseCardStatics(r.localizedName || r.name, r.productNumber);
      const data: Record<string, string> = {};
      if (statics.game !== 'other' && statics.game !== r.game) data.game = statics.game;
      if (r.game === '' && statics.game === 'other') data.game = 'other';
      if (statics.setCode && statics.setCode !== r.setCode) data.setCode = statics.setCode;
      if (statics.cardNumber && statics.cardNumber !== r.cardNumber) data.cardNumber = statics.cardNumber;
      if (statics.rarity && statics.rarity !== r.rarity) data.rarity = statics.rarity;

      if (Object.keys(data).length > 0) {
        await prisma.snkrdunkCard.update({ where: { apparelId: r.apparelId }, data });
        updated += 1;
      }
      if (!(statics.setCode ?? r.setCode) || !(statics.cardNumber ?? r.cardNumber)) {
        stillMissing += 1;
      }
    }

    return NextResponse.json({ total: rows.length, updated, stillMissing });
  } catch (err) {
    console.error('[admin.cardsCatalog.reparse]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
