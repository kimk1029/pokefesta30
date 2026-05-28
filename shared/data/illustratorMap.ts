/**
 * 일러스트레이터 한국어 ↔ TCGdex 정식명(영문/일본어) 매핑.
 *
 * 데이터는 [[shared/data/illustrators.json]] 단일 소스. 서버(Express)도 같은
 * JSON 을 fs 로 읽어 쓴다. 사용자 입력(한글) → 매핑으로 TCGdex 가 쓰는 정식
 * 이름("Shinji Kanda") 을 찾아 그 작가의 카드 리스트를 조회.
 *
 * 한국어 표기는 표준화돼 있지 않아 여러 변형(공백 유무 / 성-이름 순서)을 함께
 * 등록. 매칭은 normalize(공백 제거 + 소문자) 후 정확 일치.
 */

import data from './illustrators.json';

export interface IllustratorEntry {
  tcgdexName: string;
  ja?: string;
  en: string;
  koAliases: string[];
}

export const ILLUSTRATORS: IllustratorEntry[] = data as IllustratorEntry[];

function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

export interface IllustratorLookup {
  matched: IllustratorEntry | null;
  /** TCGdex 쿼리에 쓸 정식 이름. matched 면 tcgdexName, 미매칭이면 입력 그대로. */
  tcgdexName: string;
}

/**
 * 사용자 입력(한/영/일) 으로 일러스트레이터 검색.
 * 매칭 실패 시 입력 그대로를 fallback name 으로 돌려 — 사전에 없는 이름이라도
 * 영문 그대로 입력했다면 TCGdex 가 검색해 줄 수 있다.
 */
export function lookupIllustrator(query: string): IllustratorLookup {
  const raw = (query ?? '').trim();
  if (!raw) return { matched: null, tcgdexName: '' };
  const norm = normalize(raw);
  for (const e of ILLUSTRATORS) {
    if (e.koAliases.some((a) => normalize(a) === norm)) return { matched: e, tcgdexName: e.tcgdexName };
    if (e.ja && normalize(e.ja) === norm) return { matched: e, tcgdexName: e.tcgdexName };
    if (normalize(e.en) === norm) return { matched: e, tcgdexName: e.tcgdexName };
    if (normalize(e.tcgdexName) === norm) return { matched: e, tcgdexName: e.tcgdexName };
  }
  return { matched: null, tcgdexName: raw };
}

/** 자동완성용 — 일부 입력으로 후보 일러스트레이터 N개 반환. */
export function suggestIllustrators(query: string, limit = 8): IllustratorEntry[] {
  const norm = normalize(query ?? '');
  if (!norm) return ILLUSTRATORS.slice(0, limit);
  const hits: IllustratorEntry[] = [];
  for (const e of ILLUSTRATORS) {
    const haystacks = [...e.koAliases.map(normalize), normalize(e.en), e.ja ? normalize(e.ja) : ''];
    if (haystacks.some((h) => h.includes(norm))) hits.push(e);
    if (hits.length >= limit) break;
  }
  return hits;
}
