/**
 * 한국 멀티소스 시세 집계 — "어댑터 패턴".
 *
 * 카드 1장(코드+번호+등급+이름)을 받아 활성화된 국내 소스들에 병렬 검색을 던지고,
 * 각 소스 결과를 setCode+cardNumber+rarity 로 매칭해 가장 정확한 한 건을 정규화 행으로 돌려준다.
 *
 * 소스 추가 방법: Adapter 하나를 ADAPTERS 에 넣기만 하면 끝.
 *   - KREAM        : ✅ 동작 (검색 HTML 파싱, 즉시판매가=판매)
 *   - TCGBox       : ⏸ 스텁 — Cafe24 EC-Front 가 상품을 JS(async)로 렌더 → AJAX 엔드포인트
 *                    역공학 또는 헤드리스 필요. enabled=false.
 *   - 네이버카페   : ⏸ 스텁 — 경매 낙찰가(=체결가). 카드별 키워드 검색 API 역공학 필요.
 *   - 네이버쇼핑   : 제외 — 안티봇(418). 공식 검색 API 키 발급 시 별도 어댑터.
 *
 * 모든 소스 호출은 allSettled 로 격리 — 한 소스가 죽어도 나머지는 반환된다.
 */
import { fetchKreamSearch } from '@/lib/kream';
import { bestKreamMatch } from '../../shared/util/kreamMatch';

/** 체결가(낙찰/거래) vs 판매가(쇼핑몰 호가) 구분. */
export type KoPriceKind = '체결' | '판매';

export interface KoPriceRow {
  /** 소스 키 (kream/tcgbox/navercafe …). */
  source: string;
  /** 표시용 라벨. */
  label: string;
  /** 체결가인지 판매가(호가)인지. */
  kind: KoPriceKind;
  /** 가격 (KRW). */
  price: number;
  /** 매칭된 상품/글 제목. */
  title: string;
  /** 원본 링크. */
  url: string;
  /** 썸네일 (있으면). */
  imageUrl?: string | null;
  /** 체결 시각 (체결가 소스만). */
  soldAt?: string | null;
}

/** 카드 식별 힌트 — bestKreamMatch 가 setCode/cardNumber/rarity 로 정확도 채점. */
export interface KoPriceHints {
  name: string;
  setCode?: string | null;
  cardNumber?: string | null;
  rarity?: string | null;
}

interface Adapter {
  key: string;
  label: string;
  kind: KoPriceKind;
  enabled: boolean;
  run(h: KoPriceHints): Promise<KoPriceRow[]>;
}

/* ── KREAM (즉시판매가 = 판매) ───────────────────────────────────── */
const kreamAdapter: Adapter = {
  key: 'kream',
  label: 'KREAM',
  kind: '판매',
  enabled: true,
  async run(h) {
    const items = await fetchKreamSearch(h.name);
    const best = bestKreamMatch(items, h.name, {
      setCode: h.setCode ?? null,
      cardNumber: h.cardNumber ?? null,
      rarity: h.rarity ?? null,
    });
    if (!best || !best.price) return [];
    return [
      {
        source: 'kream',
        label: 'KREAM',
        kind: '판매',
        price: best.price,
        title: best.name,
        url: best.productUrl,
        imageUrl: best.imageUrl,
      },
    ];
  },
};

/* ── TCGBox (스텁 — JS 렌더, AJAX 역공학 필요) ───────────────────── */
const tcgboxAdapter: Adapter = {
  key: 'tcgbox',
  label: 'TCGBox',
  kind: '판매',
  enabled: false,
  async run() {
    return [];
  },
};

/* ── 네이버카페 경매 (스텁 — 낙찰가=체결, 검색 API 역공학 필요) ──── */
const naverCafeAdapter: Adapter = {
  key: 'navercafe',
  label: '네이버카페',
  kind: '체결',
  enabled: false,
  async run() {
    return [];
  },
};

const ADAPTERS: Adapter[] = [kreamAdapter, tcgboxAdapter, naverCafeAdapter];

/** 활성 소스를 병렬 조회해 정규화 행을 합쳐 반환. 체결가 먼저, 그다음 가격 오름차순. */
export async function aggregateKoPrices(h: KoPriceHints): Promise<KoPriceRow[]> {
  if (!h.name) return [];
  const active = ADAPTERS.filter((a) => a.enabled);
  const settled = await Promise.allSettled(active.map((a) => a.run(h)));
  const rows: KoPriceRow[] = [];
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') rows.push(...s.value);
    else console.error('[koMarket]', active[i].key, s.reason);
  });
  return rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === '체결' ? -1 : 1;
    return a.price - b.price;
  });
}
