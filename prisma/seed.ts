import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const places = [
    { id: 'seongsu',  name: '성수역 부근',     emoji: '🚇', bg: '#E63946', level: 'full',   count: 12 },
    { id: 'seoulsup', name: '서울숲역 부근',   emoji: '🌳', bg: '#4ADE80', level: 'empty',  count: 8  },
    { id: 'secret',   name: '시크릿 포레스트', emoji: '🌲', bg: '#3A5BD9', level: 'normal', count: 5  },
    { id: 'metamong', name: '메타몽 놀이터',   emoji: '🎪', bg: '#FFD23F', level: 'busy',   count: 9  },
    { id: 'shoe',     name: '구두테마공원',     emoji: '👟', bg: '#FB923C', level: 'normal', count: 3  },
    { id: 'rainbow',  name: '무지개어린이공원', emoji: '🌈', bg: '#FAE8FF', level: 'empty',  count: 2  },
  ];
  for (const p of places) {
    await prisma.place.upsert({ where: { id: p.id }, update: p, create: p });
  }

  const now = Date.now();
  const mins = (n: number) => new Date(now - n * 60_000);

  // 통합 피드 시드 — general + report 섞어서 타임라인 생성
  await prisma.feed.createMany({
    data: [
      // 제보 (kind='report', level 필수)
      { kind: 'report', level: 'full',   placeId: 'seongsu',  text: '지금 줄이 역까지! 40분 각오',    authorEmoji: '🐢', createdAt: mins(1)  },
      { kind: 'report', level: 'empty',  placeId: 'seoulsup', text: '지금 바로 받을 수 있어요',        authorEmoji: '🦆', createdAt: mins(3)  },
      { kind: 'report', level: 'busy',   placeId: 'metamong', text: '10명 정도 대기. 회전은 빠름',     authorEmoji: '🐿️', createdAt: mins(7)  },
      // 일반 (kind='general')
      { kind: 'general', placeId: 'seongsu',  text: '오늘 날씨 진짜 너무 덥다 아이스크림 먹으면서 대기 중 ㅎㅎ', authorEmoji: '🌟', createdAt: mins(2)  },
      { kind: 'general', placeId: 'seoulsup', text: '서울숲 입구에 굿즈 파는 분 계셨는데 다 나가셨나요?',       authorEmoji: '🎈', createdAt: mins(5)  },
      { kind: 'general', placeId: 'secret',   text: '여기 포토존 너무 예쁘다 줄 서도 인증샷 가능!',              authorEmoji: '📸', createdAt: mins(11) },
      { kind: 'general', placeId: null as unknown as string, text: '오늘도 화이팅입니다!', authorEmoji: '⭐', createdAt: mins(15) },
    ],
  });

  // 최신 report 로 places 동기화
  for (const placeId of ['seongsu', 'seoulsup', 'metamong']) {
    const latest = await prisma.feed.findFirst({
      where: { placeId, kind: 'report' },
      orderBy: { createdAt: 'desc' },
    });
    if (latest?.level) {
      await prisma.place.update({
        where: { id: placeId },
        data: { level: latest.level, lastReportAt: latest.createdAt },
      });
    }
  }

  await prisma.trade.createMany({
    data: [
      { placeId: 'seongsu',  type: 'sell', title: '잉어킹 프로모 코드 1장 판매',      price: '1.5만', authorEmoji: '🐻', createdAt: mins(1)  },
      { placeId: 'seoulsup', type: 'buy',  title: '잉어킹 프로모 구해요! 서울숲 근처',price: '제안',  authorEmoji: '🦊', createdAt: mins(2)  },
      { placeId: 'secret',   type: 'sell', title: '프로모 + 굿즈 세트 양도 가능',     price: '2.2만', authorEmoji: '🐧', createdAt: mins(5)  },
      { placeId: 'metamong', type: 'buy',  title: '프로모만 삽니다 근처 직거래 희망',  price: '1만~',   authorEmoji: '🐤', createdAt: mins(12) },
    ],
  });

  const [places$, feeds$, feedsReport$, trades$] = await Promise.all([
    prisma.place.count(),
    prisma.feed.count(),
    prisma.feed.count({ where: { kind: 'report' } }),
    prisma.trade.count(),
  ]);
  console.log(`seeded → places:${places$} feeds(all):${feeds$} feeds(report):${feedsReport$} trades:${trades$}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
