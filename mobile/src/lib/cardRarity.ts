/**
 * 포켓몬 TCG 등급 토큰 — 웹 src/lib/cardRarity.ts 의 mobile 미러.
 * 두 코드베이스가 분리되어 있어 사본 유지. 동작은 동일.
 */

export type Rarity =
  | 'C'
  | 'U'
  | 'R'
  | 'RR'
  | 'AR'
  | 'SAR'
  | 'SR'
  | 'HR'
  | 'UR'
  | 'MA'
  | 'MUR'
  | 'CHR';

export const RARITY_ORDER: Rarity[] = [
  'C', 'U', 'R', 'RR', 'AR', 'SR', 'SAR', 'HR', 'UR', 'MA', 'MUR', 'CHR',
];

export const RARITY_BG: Record<Rarity, string> = {
  C: '#94A3B8', U: '#22C55E', R: '#3A5BD9', RR: '#0EA5E9',
  AR: '#A855F7', SR: '#7C3AED', SAR: '#EC4899', HR: '#F97316',
  UR: '#F59E0B', MA: '#DC2626', MUR: '#B91C1C', CHR: '#FFD23F',
};

export const RARITY_FG: Record<Rarity, string> = {
  C: '#FFFFFF', U: '#FFFFFF', R: '#FFFFFF', RR: '#FFFFFF',
  AR: '#FFFFFF', SR: '#FFFFFF', SAR: '#FFFFFF', HR: '#FFFFFF',
  UR: '#1A1A2E', MA: '#FFFFFF', MUR: '#FFFFFF', CHR: '#1A1A2E',
};

const TOKENS_BY_LENGTH: Rarity[] = [
  'MUR', 'SAR', 'CHR', 'MA', 'AR', 'HR', 'UR', 'SR', 'RR', 'R', 'U', 'C',
];

function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[A-Za-z0-9]/.test(ch);
}

export function detectRarity(
  ...names: Array<string | null | undefined>
): Rarity {
  for (const raw of names) {
    if (!raw) continue;
    const upper = raw.toUpperCase();
    for (const tok of TOKENS_BY_LENGTH) {
      let idx = 0;
      while ((idx = upper.indexOf(tok, idx)) !== -1) {
        const before = upper[idx - 1];
        const after = upper[idx + tok.length];
        if (!isWordChar(before) && !isWordChar(after)) {
          return tok;
        }
        idx += tok.length;
      }
    }
  }
  return 'C';
}
