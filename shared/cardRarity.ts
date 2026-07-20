/**
 * 포켓몬 TCG 등급 토큰 (C / U / R / RR / AR / SAR / SR / HR / UR / MA / MUR / CHR).
 * 스니덩크 상품명/별칭에서 가장 잘 어울리는 등급을 추출한다.
 *
 * 웹·모바일 공유 단일 소스 — src/lib/cardRarity.ts, mobile/src/lib/cardRarity.ts 는
 * 이 파일의 re-export shim.
 *
 * 우선순위: 가장 긴 토큰부터 매칭 (SAR 가 AR 보다 먼저, MUR 가 UR 보다 먼저).
 * 매칭이 안 되면 'C'.
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

/** 필터 / 라벨 순서 — 낮은 등급 → 높은 등급. */
export const RARITY_ORDER: Rarity[] = [
  'C',
  'U',
  'R',
  'RR',
  'AR',
  'SR',
  'SAR',
  'HR',
  'UR',
  'MA',
  'MUR',
  'CHR',
];

/** 픽셀프레스 배지 색 — RR 이상은 골드/퍼플 강조. */
export const RARITY_BG: Record<Rarity, string> = {
  C: '#94A3B8',
  U: '#22C55E',
  R: '#3A5BD9',
  RR: '#0EA5E9',
  AR: '#A855F7',
  SR: '#7C3AED',
  SAR: '#EC4899',
  HR: '#F97316',
  UR: '#F59E0B',
  MA: '#DC2626',
  MUR: '#B91C1C',
  CHR: '#FFD23F',
};

export const RARITY_FG: Record<Rarity, string> = {
  C: '#FFFFFF',
  U: '#FFFFFF',
  R: '#FFFFFF',
  RR: '#FFFFFF',
  AR: '#FFFFFF',
  SR: '#FFFFFF',
  SAR: '#FFFFFF',
  HR: '#FFFFFF',
  UR: '#1A1A2E',
  MA: '#FFFFFF',
  MUR: '#FFFFFF',
  CHR: '#1A1A2E',
};

// 긴 토큰 먼저. 단어 경계는 매칭에서 직접 체크 (한국어/일본어 콘텍스트 호환을 위해 \b 미사용).
const TOKENS_BY_LENGTH: Rarity[] = [
  'MUR',
  'SAR',
  'CHR',
  'MA',
  'AR',
  'HR',
  'UR',
  'SR',
  'RR',
  'R',
  'U',
  'C',
];

function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[A-Za-z0-9]/.test(ch);
}

/**
 * 카드명 후보들에서 등급 토큰을 추출.
 * 단어 경계 (영문/숫자 인접 X) 를 손수 확인 — 한글/일본어/괄호 등의 사이에 끼인 토큰을 잡아낸다.
 *   '리자몽 ex SAR (091/064)' → 'SAR'
 *   'リザードンex SR' → 'SR'
 *   '피카츄 ex AR-홀로' → 'AR'
 */
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
