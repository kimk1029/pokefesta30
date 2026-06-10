/**
 * SNKRDUNK 마스터 카드 카탈로그 — "우리 DB 우선" 적재/조회 헬퍼.
 *
 * 정책:
 *   - 카드의 *변하지 않는* 정보(이름/이미지/세트코드/카드번호/레어도 등)는
 *     SnkrdunkCard 한 행에 누적 upsert. apparelId 가 곧 스니덩 링크
 *     (snkrdunk.com/apparels/{apparelId}).
 *   - 가격은 SnkrdunkPriceSnapshot 에 append-only — 현재가 = 최신 행.
 *   - 조회는 DB 우선: 최신 스냅샷이 TTL 이내면 스니덩을 호출하지 않는다.
 *
 * 모든 DB 쓰기는 응답에 영향 주지 않게 삼키고 로깅만 한다.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import { fetchSnkrdunkApparel, type SnkrdunkApparel } from '@/lib/snkrdunk';

/** 컬렉션/즐겨찾기 시세 신선 기준 — 이 시간 이내 스냅샷이면 라이브 호출 생략. */
export const CATALOG_PRICE_TTL_MS = 30 * 60 * 1000;

/* ── 정적 정보 파싱 ──────────────────────────────────────────────── */

const RARITY_RE = /\b(SAR|CSR|CHR|HR|UR|SSR|SR|RRR|RR|AR|IR|SEC|PROMO|プロモ)\b/i;
// "[OP02-059]" / "[123/165]" / "[SV1a 073/073]" 류의 대괄호 식별자
const BRACKET_RE = /[[［]([A-Za-z0-9\-./ ]{2,20})[\]］]/;

export interface ParsedCardStatics {
  setCode: string | null;
  cardNumber: string | null;
  rarity: string | null;
}

/** 카드 이름/품번에서 세트코드·카드번호·레어도를 best-effort 로 추출. 실패는 null. */
export function parseCardStatics(name: string, productNumber?: string): ParsedCardStatics {
  const src = `${name} ${productNumber ?? ''}`;
  const rarity = src.match(RARITY_RE)?.[1]?.toUpperCase() ?? null;

  let setCode: string | null = null;
  let cardNumber: string | null = null;
  const bracket = name.match(BRACKET_RE)?.[1]?.trim();
  if (bracket) {
    // "OP02-059" → set OP02 / no 059, "EB01-006" 등
    const dash = bracket.match(/^([A-Za-z]{1,4}\d{1,3}[a-z]?)-(\w{1,8})$/);
    // "073/102" 단독 → 카드번호만
    const frac = bracket.match(/^(\d{1,4}\/\d{1,4})$/);
    // "SV1a 073/073" → set + 번호
    const both = bracket.match(/^([A-Za-z]{1,4}\d{1,3}[a-z]?)\s+(\d{1,4}\/\d{1,4})$/);
    if (dash) {
      setCode = dash[1].toUpperCase();
      cardNumber = dash[2];
    } else if (both) {
      setCode = both[1];
      cardNumber = both[2];
    } else if (frac) {
      cardNumber = frac[1];
    }
  }
  return { setCode, cardNumber, rarity };
}

function shorten(name: string): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > 22 ? cut.slice(0, 21) + '…' : cut;
}

/* ── 적재 (upsert / append) ──────────────────────────────────────── */

/** apparel 상세 1건의 정적 정보를 카탈로그에 upsert. 실패는 로깅만. */
export async function upsertCatalogCard(
  a: SnkrdunkApparel,
  extra: { packCode?: string; apparelGroupId?: number | null } = {},
): Promise<void> {
  try {
    const jp = a.localizedName || a.name || '';
    const statics = parseCardStatics(jp, a.productNumber);
    const data = {
      name: a.name ?? '',
      localizedName: jp,
      koName: translateKnownCardNameToKo(jp),
      itemKind: a.itemKind,
      shortName: shorten(jp),
      imageUrl: a.imageUrl,
      productNumber: a.productNumber ?? '',
      releasedAt: a.releasedAt ? a.releasedAt.slice(0, 10) : undefined,
      setCode: statics.setCode,
      cardNumber: statics.cardNumber,
      rarity: statics.rarity,
      ...(extra.packCode ? { packCode: extra.packCode } : {}),
      ...(extra.apparelGroupId ? { apparelGroupId: extra.apparelGroupId } : {}),
    };
    await prisma.snkrdunkCard.upsert({
      where: { apparelId: a.id },
      create: { apparelId: a.id, ...data },
      update: data,
    });
  } catch (err) {
    console.error('[snkrdunkCatalog.upsert]', a.id, err);
  }
}

/**
 * 검색 결과(이름/이미지만 있는 얕은 데이터)를 카탈로그에 적재.
 * 이미 있는 행의 itemKind/품번 등 풍부한 정보는 건드리지 않는다.
 */
export async function upsertSearchResults(
  results: Array<{ apparelId: number; name: string; imageUrl: string | null }>,
): Promise<void> {
  try {
    for (const r of results) {
      const statics = parseCardStatics(r.name);
      await prisma.snkrdunkCard.upsert({
        where: { apparelId: r.apparelId },
        create: {
          apparelId: r.apparelId,
          name: r.name,
          localizedName: r.name,
          koName: translateKnownCardNameToKo(r.name),
          shortName: shorten(r.name),
          imageUrl: r.imageUrl,
          setCode: statics.setCode,
          cardNumber: statics.cardNumber,
          rarity: statics.rarity,
        },
        // 얕은 데이터로 기존 행을 덮지 않게 — 이미지/이름만 보강.
        update: {
          localizedName: r.name,
          koName: translateKnownCardNameToKo(r.name),
          ...(r.imageUrl ? { imageUrl: r.imageUrl } : {}),
        },
      });
    }
  } catch (err) {
    console.error('[snkrdunkCatalog.upsertSearch]', err);
  }
}

/** 시세 스냅샷 append. priceSingle/pricePsa10/trend 는 계산된 경우에만. */
export async function recordPriceSnapshot(
  apparelId: number,
  price: {
    minPrice: number;
    listingCount?: number;
    priceSingle?: number;
    pricePsa10?: number;
    trend?: number[];
  },
): Promise<void> {
  try {
    await prisma.snkrdunkPriceSnapshot.create({
      data: {
        apparelId,
        minPrice: Math.max(0, Math.round(price.minPrice || 0)),
        listingCount: price.listingCount ?? 0,
        priceSingle: Math.max(0, Math.round(price.priceSingle ?? 0)),
        pricePsa10: Math.max(0, Math.round(price.pricePsa10 ?? 0)),
        trend: price.trend && price.trend.length > 0 ? price.trend : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error('[snkrdunkCatalog.snapshot]', apparelId, err);
  }
}

/**
 * 카탈로그에 없는 apparelId 면 스니덩에서 1회 조회해 적재.
 * 컬렉션 추가 등 "이 카드가 우리 DB 에 꼭 있어야 하는" 시점에 호출.
 */
export async function ensureCatalogCard(apparelId: number): Promise<void> {
  try {
    const exists = await prisma.snkrdunkCard.findUnique({
      where: { apparelId },
      select: { apparelId: true },
    });
    if (exists) return;
    const a = await fetchSnkrdunkApparel(apparelId);
    if (!a) return;
    await upsertCatalogCard(a);
    if (a.minPrice > 0) {
      await recordPriceSnapshot(apparelId, { minPrice: a.minPrice, listingCount: a.listingCount });
    }
  } catch (err) {
    console.error('[snkrdunkCatalog.ensure]', apparelId, err);
  }
}

/* ── 조회 (DB 우선) ──────────────────────────────────────────────── */

export interface CatalogEntry {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  /** 최신 스냅샷 — 없으면 null. */
  snapshot: {
    minPrice: number;
    listingCount: number;
    priceSingle: number;
    pricePsa10: number;
    trend: number[];
    fetchedAt: Date;
  } | null;
}

/** 카탈로그 행 + apparelId 별 최신 시세 스냅샷을 한 번에 로드. */
export async function loadCatalogEntries(ids: number[]): Promise<Map<number, CatalogEntry>> {
  const map = new Map<number, CatalogEntry>();
  if (ids.length === 0) return map;
  try {
    const [cards, snaps] = await Promise.all([
      prisma.snkrdunkCard.findMany({ where: { apparelId: { in: ids } } }),
      prisma.$queryRaw<
        Array<{
          apparelId: number;
          minPrice: number;
          listingCount: number;
          priceSingle: number;
          pricePsa10: number;
          trend: unknown;
          fetchedAt: Date;
        }>
      >`
        SELECT DISTINCT ON ("apparelId")
          "apparelId", "minPrice", "listingCount", "priceSingle", "pricePsa10", "trend", "fetchedAt"
        FROM "snkrdunk_price_snapshots"
        WHERE "apparelId" IN (${Prisma.join(ids)})
        ORDER BY "apparelId", "fetchedAt" DESC
      `,
    ]);
    const snapById = new Map<number, (typeof snaps)[number]>(
      snaps.map((s) => [Number(s.apparelId), s]),
    );
    for (const c of cards) {
      const s = snapById.get(c.apparelId);
      map.set(c.apparelId, {
        apparelId: c.apparelId,
        name: c.localizedName || c.name,
        imageUrl: c.imageUrl,
        snapshot: s
          ? {
              minPrice: Number(s.minPrice),
              listingCount: Number(s.listingCount),
              priceSingle: Number(s.priceSingle),
              pricePsa10: Number(s.pricePsa10),
              trend: Array.isArray(s.trend) ? (s.trend as number[]) : [],
              fetchedAt: s.fetchedAt,
            }
          : null,
      });
    }
  } catch (err) {
    console.error('[snkrdunkCatalog.load]', err);
  }
  return map;
}

/** 스냅샷이 신선하고(시세 TTL 이내) 가격 계산이 있는 엔트리인지. */
export function isFreshEntry(e: CatalogEntry | undefined, ttlMs = CATALOG_PRICE_TTL_MS): boolean {
  if (!e || !e.snapshot) return false;
  if (Date.now() - e.snapshot.fetchedAt.getTime() > ttlMs) return false;
  // priceSingle 까지 계산된 풀 스냅샷만 신선 취급 — 목록 수집 스냅샷(minPrice만)으로
  // 컬렉션 시세를 대체하면 PSA10/차트가 비어버린다.
  return e.snapshot.priceSingle > 0 || e.snapshot.minPrice > 0;
}
