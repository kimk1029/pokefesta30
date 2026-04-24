/**
 * 오리파 — 서버 공유 상태.
 *
 * 정책:
 *   - packId 별 100칸. 첫 조회 시 테이블에 없으면 53칸 mock drawn 으로 시드(기존 UX 유지).
 *   - pull 은 updateMany({where: {packId, index, drawn:false}}) 원자 업데이트 → 경쟁 시 한 명만 성공.
 *   - 클라이언트는 8초 폴링으로 타 유저 pull 반영.
 */
import { prisma } from './prisma';
import type { OripaGrade, OripaTicket } from './types';

export interface PullResult {
  index: number;
  grade: OripaGrade;
  prizeName: string;
  prizeEmoji: string;
}

const GRADES: Array<{ g: Exclude<OripaGrade, 'last'>; name: string; emoji: string; weight: number }> = [
  { g: 'C', name: '스티커 팩',          emoji: '🌟', weight: 60 },
  { g: 'B', name: '몬스터볼 스킨',      emoji: '⚪', weight: 25 },
  { g: 'A', name: '프리미엄 뱃지',      emoji: '🏅', weight: 12 },
  { g: 'S', name: '잉어킹 홀로 프레임', emoji: '🖼', weight: 3 },
];

function pickGrade(seed: number): (typeof GRADES)[number] {
  let r = ((seed % 100) + 100) % 100;
  for (const g of GRADES) {
    if (r < g.weight) return g;
    r -= g.weight;
  }
  return GRADES[0];
}

/** 결정적 시드로 packId 별 53칸 mock drawn 채움 — 첫 진입 시 UI 비어보이지 않도록. */
function buildSeed(packId: string) {
  const drawnIdx = new Set<number>();
  let seed = hash(packId);
  while (drawnIdx.size < 53) {
    seed = (seed * 9301 + 49297) % 233280;
    drawnIdx.add(seed % 100);
  }
  const mockNames = ['🦊', '🐻', '🐤', '🦆', '🐢', '🐿️', '🐺', '🐧', '🐳', '🦁'];
  return Array.from({ length: 100 }, (_, i) => {
    if (!drawnIdx.has(i)) {
      return { packId, index: i, drawn: false };
    }
    const g = pickGrade(i * 31 + 17);
    return {
      packId,
      index: i,
      drawn: true,
      grade: g.g,
      prizeName: g.name,
      prizeEmoji: g.emoji,
      drawnById: null as string | null,
      drawnByName: mockNames[i % mockNames.length],
      drawnAt: new Date(Date.now() - ((i % 30) + 1) * 60_000),
    };
  });
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 13579;
}

type DbRow = Awaited<ReturnType<typeof prisma.oripaTicket.findMany>>[number];

function toClient(r: DbRow): OripaTicket {
  return {
    index: r.index,
    drawn: r.drawn,
    grade: (r.grade ?? undefined) as OripaGrade | undefined,
    prizeName: r.prizeName ?? undefined,
    prizeEmoji: r.prizeEmoji ?? undefined,
    drawnBy: r.drawnByName ?? undefined,
    drawnAt: r.drawnAt ? relTime(r.drawnAt) : undefined,
  };
}

function relTime(d: Date): string {
  const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60_000));
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 패키지 별 100칸 조회. 없으면 시드 후 재조회. */
export async function getOripaTickets(packId: string): Promise<OripaTicket[]> {
  const existing = await prisma.oripaTicket.findMany({
    where: { packId },
    orderBy: { index: 'asc' },
  });
  if (existing.length >= 100) return existing.map(toClient);

  // 시드 — 이미 일부만 있어도 단순히 전부 createMany(skipDuplicates:true) 로 채움
  await prisma.oripaTicket.createMany({
    data: buildSeed(packId),
    skipDuplicates: true,
  });
  const seeded = await prisma.oripaTicket.findMany({
    where: { packId },
    orderBy: { index: 'asc' },
  });
  return seeded.map(toClient);
}

export interface PullOutcome {
  results: PullResult[];
  /** 다른 유저가 먼저 뽑아서 실패한 인덱스들 */
  alreadyDrawn: number[];
}

/**
 * 여러 인덱스를 서버에서 순차 원자 업데이트.
 * updateMany({where: {drawn:false}}) count>0 인 경우만 성공 처리 → 경쟁 안전.
 */
export async function pullOripaTickets(
  packId: string,
  indices: number[],
  user: { id: string; name: string },
): Promise<PullOutcome> {
  const results: PullResult[] = [];
  const alreadyDrawn: number[] = [];

  const uniq = Array.from(new Set(indices)).filter(
    (n) => Number.isInteger(n) && n >= 0 && n < 100,
  );

  for (let i = 0; i < uniq.length; i++) {
    const idx = uniq[i];
    const g = pickGrade(idx + Date.now() + i + hash(user.id));
    const res = await prisma.oripaTicket.updateMany({
      where: { packId, index: idx, drawn: false },
      data: {
        drawn: true,
        grade: g.g,
        prizeName: g.name,
        prizeEmoji: g.emoji,
        drawnById: user.id,
        drawnByName: user.name,
        drawnAt: new Date(),
      },
    });
    if (res.count === 0) {
      alreadyDrawn.push(idx);
    } else {
      results.push({ index: idx, grade: g.g, prizeName: g.name, prizeEmoji: g.emoji });
    }
  }

  return { results, alreadyDrawn };
}
