/**
 * 한국 멀티소스 시세 조회 (클라이언트).
 * NAS `/api/korea-price` 를 호출해 소스별 체결/판매가 행을 받는다.
 */
export type KoPriceKind = '체결' | '판매';

export interface KoPriceRow {
  source: string;
  label: string;
  kind: KoPriceKind;
  price: number;
  title: string;
  url: string;
  imageUrl?: string | null;
  soldAt?: string | null;
}

export interface KoPriceQuery {
  name: string;
  setCode?: string | null;
  cardNumber?: string | null;
  rarity?: string | null;
}

export async function fetchKoPrices(
  q: KoPriceQuery,
  signal?: AbortSignal,
): Promise<KoPriceRow[]> {
  const qs = new URLSearchParams({ name: q.name });
  if (q.setCode) qs.set('setCode', q.setCode);
  if (q.cardNumber) qs.set('num', q.cardNumber);
  if (q.rarity) qs.set('rarity', q.rarity);
  try {
    const res = await fetch(`/api/korea-price?${qs.toString()}`, { signal });
    const json = (await res.json()) as { rows?: KoPriceRow[] };
    return json.rows ?? [];
  } catch {
    return [];
  }
}
