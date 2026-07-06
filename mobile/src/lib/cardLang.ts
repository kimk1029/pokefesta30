/**
 * 카드명 번역 — 서버 공통 엔진(/api/card-lang, 웹과 동일한 src/lib/cardTranslate)을
 * 호출한다. 앱·웹이 같은 번역 결과를 받는 단일 처리 지점.
 * 네트워크 실패 시에만 번들 내 로컬 사전(koToJaSearch/localizeCardName)으로 폴백.
 * 결과는 인메모리 캐시 — 같은 세션에서 같은 이름은 재요청하지 않는다.
 */
import { api } from '@/lib/apiClient';
import { koToJaSearch } from '@/lib/cardSearchJa';
import { localizeCardName } from '@/lib/cardNameKo';

const koJaCache = new Map<string, string>();
const jaKoCache = new Map<string, string>();

/** 검색어 한→일 — 서버 translate(q,'ja'). 실패 시 로컬 koToJaSearch 폴백. */
export async function koToJaServer(q: string): Promise<string> {
  const key = q.trim();
  if (!key) return q;
  const hit = koJaCache.get(key);
  if (hit != null) return hit;
  try {
    const r = await api<{ ja: string }>(`/api/card-lang/ko-ja?q=${encodeURIComponent(key)}`, { auth: false });
    const ja = r.ja || key;
    koJaCache.set(key, ja);
    return ja;
  } catch {
    return koToJaSearch(key) || key;
  }
}

/**
 * 표시명 일→한 배치 — 서버 translateKnownCardNameToKo. 실패 시 로컬 폴백.
 * 반환: 원문 → 번역 Map (캐시 포함, 입력 순서 무관 조회용).
 */
export async function jaToKoBatch(names: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const misses: string[] = [];
  for (const n of names) {
    if (!n) continue;
    const hit = jaKoCache.get(n);
    if (hit != null) out.set(n, hit);
    else if (!misses.includes(n)) misses.push(n);
  }
  if (misses.length > 0) {
    try {
      // 서버 배치 상한 200 — 필요 시 분할.
      for (let i = 0; i < misses.length; i += 200) {
        const chunk = misses.slice(i, i + 200);
        const r = await api<{ names: string[] }>('/api/card-lang/ja-ko', { method: 'POST', body: { names: chunk }, auth: false });
        chunk.forEach((n, j) => {
          const ko = r.names?.[j] || localizeCardName(n) || n;
          jaKoCache.set(n, ko);
          out.set(n, ko);
        });
      }
    } catch {
      for (const n of misses) {
        const ko = localizeCardName(n) || n;
        jaKoCache.set(n, ko);
        out.set(n, ko);
      }
    }
  }
  return out;
}

/** 단건 일→한 — 배치의 편의 래퍼. */
export async function jaToKoServer(name: string): Promise<string> {
  if (!name) return name;
  const m = await jaToKoBatch([name]);
  return m.get(name) ?? name;
}

/** 동기 조회 — 이미 서버 번역이 캐시돼 있으면 그 값, 아니면 로컬 폴백. 렌더용. */
export function jaToKoCached(name: string): string {
  if (!name) return name;
  return jaKoCache.get(name) ?? localizeCardName(name) ?? name;
}
