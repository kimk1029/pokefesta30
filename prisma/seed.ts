import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 거래 만남 장소 (페스타 혼잡도 추적은 제거됨)
  const places = [
    { id: 'seongsu',  name: '성수역 부근',   emoji: '🚇', bg: '#E63946' },
    { id: 'seoulsup', name: '서울숲역 부근', emoji: '🌳', bg: '#4ADE80' },
  ];
  for (const p of places) {
    await prisma.place.upsert({ where: { id: p.id }, update: p, create: p });
  }

  const now = Date.now();
  const mins = (n: number) => new Date(now - n * 60_000);

  // 커뮤니티 피드 시드
  await prisma.feed.createMany({
    data: [
      { text: '드디어 리자몽 EX PSA 9 받았다!! 3개월 기다린 보람이 있네', authorEmoji: '🐉', createdAt: mins(1) },
      { text: '이 피카츄 VMAX 상태 어떻게 보시나요? 제출 전에 감정 부탁드립니다', authorEmoji: '⚡', createdAt: mins(15) },
      { text: 'MTG 블랙로터스 수집하시는 분들 연락 주세요!', authorEmoji: '🌹', createdAt: mins(120) },
      { text: 'PSA 10 카이바 슈라이! 전 세계 팝 6개 중 1개 입니다', authorEmoji: '🌟', createdAt: mins(300) },
    ],
  });

  await prisma.trade.createMany({
    data: [
      { placeId: 'seongsu',  type: 'sell', title: '리자몽 EX PSA 9 판매',           price: '12.8만', authorEmoji: '🐻', createdAt: mins(1)  },
      { placeId: 'seoulsup', type: 'buy',  title: '피카츄 VMAX 구합니다',           price: '제안',   authorEmoji: '🦊', createdAt: mins(2)  },
      { placeId: 'seongsu',  type: 'sell', title: '카이바 슈라이 PSA 10 양도',      price: '22만',   authorEmoji: '🐧', createdAt: mins(5)  },
      { placeId: 'seoulsup', type: 'buy',  title: '뮤츠 V 직거래 희망',             price: '4만~',   authorEmoji: '🐤', createdAt: mins(12) },
    ],
  });

  const [places$, feeds$, trades$] = await Promise.all([
    prisma.place.count(),
    prisma.feed.count(),
    prisma.trade.count(),
  ]);
  console.log(`seeded → places:${places$} feeds:${feeds$} trades:${trades$}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
