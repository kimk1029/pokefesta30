import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Places (upsert)
  const places = [
    { id: 'seongsu',  name: '성수역 부근',     emoji: '🚇', bg: '#E63946', level: 'full',   count: 12 },
    { id: 'seoulsup', name: '서울숲역 부근',   emoji: '🌳', bg: '#4ADE80', level: 'empty',  count: 8  },
    { id: 'secret',   name: '시크릿 포레스트', emoji: '🌲', bg: '#3A5BD9', level: 'normal', count: 5  },
    { id: 'metamong', name: '메타몽 놀이터',   emoji: '🎪', bg: '#FFD23F', level: 'busy',   count: 9  },
    { id: 'shoe',     name: '구두테마공원',     emoji: '👟', bg: '#FB923C', level: 'normal', count: 3  },
    { id: 'rainbow',  name: '무지개어린이공원', emoji: '🌈', bg: '#FAE8FF', level: 'empty',  count: 2  },
  ];
  for (const p of places) {
    await prisma.place.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }

  // Reports — 시드 제보 (최근순)
  const now = Date.now();
  const mins = (n: number) => new Date(now - n * 60_000);

  await prisma.report.createMany({
    data: [
      { placeId: 'seongsu',  level: 'full',  note: '지금 줄이 역까지! 40분 각오',   authorEmoji: '🐢', createdAt: mins(1) },
      { placeId: 'seoulsup', level: 'empty', note: '지금 바로 받을 수 있어요',       authorEmoji: '🦆', createdAt: mins(3) },
      { placeId: 'metamong', level: 'busy',  note: '10명 정도 대기. 회전은 빠름',    authorEmoji: '🐿️', createdAt: mins(7) },
    ],
  });

  // 최신 제보로 places 동기화
  for (const placeId of ['seongsu', 'seoulsup', 'metamong']) {
    const latest = await prisma.report.findFirst({
      where: { placeId },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      await prisma.place.update({
        where: { id: placeId },
        data: { level: latest.level, lastReportAt: latest.createdAt },
      });
    }
  }

  // Trades
  await prisma.trade.createMany({
    data: [
      { placeId: 'seongsu',  type: 'sell', title: '잉어킹 프로모 코드 1장 판매',      price: '1.5만', authorEmoji: '🐻', createdAt: mins(1)  },
      { placeId: 'seoulsup', type: 'buy',  title: '잉어킹 프로모 구해요! 서울숲 근처',price: '제안',  authorEmoji: '🦊', createdAt: mins(2)  },
      { placeId: 'secret',   type: 'sell', title: '프로모 + 굿즈 세트 양도 가능',     price: '2.2만', authorEmoji: '🐧', createdAt: mins(5)  },
      { placeId: 'metamong', type: 'buy',  title: '프로모만 삽니다 근처 직거래 희망',  price: '1만~',   authorEmoji: '🐤', createdAt: mins(12) },
    ],
  });

  // Feeds — 잡담 스트림 (reports 와 분리)
  await prisma.feed.createMany({
    data: [
      { placeId: 'seongsu',  text: '오늘 날씨 진짜 너무 덥다 아이스크림 먹으면서 대기 중 ㅎㅎ', authorEmoji: '🌟', createdAt: mins(1)  },
      { placeId: 'seoulsup', text: '서울숲 입구에 굿즈 파는 분 계셨는데 다 나가셨나요?',       authorEmoji: '🎈', createdAt: mins(5)  },
      { placeId: 'secret',   text: '여기 포토존 너무 예쁘다 줄 서도 인증샷 가능!',             authorEmoji: '📸', createdAt: mins(11) },
    ],
  });

  const counts = await Promise.all([
    prisma.place.count(),
    prisma.report.count(),
    prisma.trade.count(),
    prisma.feed.count(),
  ]);
  console.log(`seeded → places:${counts[0]} reports:${counts[1]} trades:${counts[2]} feeds:${counts[3]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
