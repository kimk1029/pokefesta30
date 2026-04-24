import { prisma } from './prisma';

export interface PackPrize {
  grade: 'S' | 'A' | 'B' | 'C';
  name: string;
  emoji: string;
  weight: number;
  bg?: string;
}

const DEFAULT_PRIZES: PackPrize[] = [
  { grade: 'S', name: '잉어킹 홀로 프레임', emoji: '🖼', weight: 3,  bg: '#6B3FA0' },
  { grade: 'A', name: '프리미엄 뱃지',      emoji: '🏅', weight: 12, bg: '#3A5BD9' },
  { grade: 'B', name: '몬스터볼 스킨',       emoji: '⚪', weight: 25, bg: '#E63946' },
  { grade: 'C', name: '스티커 팩',           emoji: '🌟', weight: 60, bg: '#4ADE80' },
];

const DEFAULT_PACKS = [
  {
    id: 'box-normal',
    tier: 'normal',
    emoji: '🎁',
    name: '노멀 박스',
    desc: '몬스터볼 디자인 · 뱃지 조각',
    price: 200,
    ticketsCount: 100,
    prizes: DEFAULT_PRIZES,
  },
  {
    id: 'box-rare',
    tier: 'rare',
    emoji: '📦',
    name: '레어 박스',
    desc: '프로필 프레임 · 푸시 알림권',
    price: 500,
    ticketsCount: 100,
    prizes: DEFAULT_PRIZES.map((p) => (p.grade === 'S' ? { ...p, weight: 5 } : p)),
  },
  {
    id: 'box-premium',
    tier: 'premium',
    emoji: '💎',
    name: '프리미엄 박스',
    desc: '잉어킹 프로모 코드 · 레전드 프레임',
    price: 1000,
    ticketsCount: 100,
    prizes: DEFAULT_PRIZES.map((p) => (p.grade === 'S' ? { ...p, weight: 10 } : p)),
  },
];

export async function ensureSeeded(): Promise<{ ok: boolean; error?: string }> {
  try {
    const count = await prisma.oripaPack.count();
    if (count > 0) return { ok: true };
    await prisma.oripaPack.createMany({
      data: DEFAULT_PACKS.map((p) => ({ ...p, prizes: p.prizes as unknown as object })),
      skipDuplicates: true,
    });
    return { ok: true };
  } catch (err) {
    console.error('[ensureSeeded]', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function validatePrizes(raw: unknown): PackPrize[] {
  if (!Array.isArray(raw)) throw new Error('prizes 는 배열이어야 합니다.');
  return raw.map((p, i) => {
    if (!p || typeof p !== 'object') throw new Error(`prizes[${i}] 객체가 아님`);
    const q = p as Record<string, unknown>;
    const grade = q.grade;
    if (grade !== 'S' && grade !== 'A' && grade !== 'B' && grade !== 'C') {
      throw new Error(`prizes[${i}].grade 는 S/A/B/C 중 하나`);
    }
    const name = typeof q.name === 'string' ? q.name : '';
    const emoji = typeof q.emoji === 'string' ? q.emoji : '';
    const weight = typeof q.weight === 'number' ? q.weight : Number(q.weight);
    if (!name) throw new Error(`prizes[${i}].name 필수`);
    if (!emoji) throw new Error(`prizes[${i}].emoji 필수`);
    if (!Number.isFinite(weight) || weight < 0) throw new Error(`prizes[${i}].weight 는 0 이상 숫자`);
    const bg = typeof q.bg === 'string' ? q.bg : undefined;
    return { grade, name, emoji, weight, bg };
  });
}
