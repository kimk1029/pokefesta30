// 모든 OripaPack 의 티켓을 "새 판"으로 초기화.
// admin UI 의 "티켓 새 판" 버튼을 모든 팩에 대해 한 번에 누르는 것과 동일.
// 실행: cd admin && node scripts/reset-all-oripa-tickets.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const packs = await prisma.oripaPack.findMany({
    select: { id: true, name: true, ticketsCount: true },
  });
  if (packs.length === 0) {
    console.log('OripaPack 없음 — 작업 없음');
    return;
  }

  console.log(`팩 ${packs.length}개 발견 — 리셋 시작`);
  let totalDeleted = 0;
  for (const p of packs) {
    const [{ count }] = await prisma.$transaction([
      prisma.oripaTicket.deleteMany({ where: { packId: p.id } }),
      prisma.oripaPackHistory.create({
        data: {
          packId: p.id,
          action: 'reset_tickets',
          note: 'bulk reset (cleanup mock seed)',
          snapshot: { ticketsCount: p.ticketsCount },
        },
      }),
    ]);
    totalDeleted += count;
    console.log(`  - ${p.id} (${p.name}): ${count}칸 삭제`);
  }
  console.log(`완료 — 총 ${totalDeleted}칸 삭제`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
