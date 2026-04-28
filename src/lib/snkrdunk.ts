const SNKRDUNK_ORIGIN = 'https://snkrdunk.com';

export interface SnkrdunkApparelSnapshot {
  apparelId: number;
  source: 'snkrdunk-public-page';
  url: string;
  name: string | null;
  sku: string | null;
  imageUrl: string | null;
  currency: 'JPY';
  minPrice: number | null;
  displayPrice: string | null;
  listingCount: number | null;
  displayListingCount: string | null;
  fetchedAt: string;
}

interface DataLayerItem {
  item_id?: number;
  item_image_url?: string;
  item_name?: string;
  item_sku_id?: string;
  item_url?: string;
}

export function snkrdunkApparelUrl(apparelId: number): string {
  return `${SNKRDUNK_ORIGIN}/apparels/${apparelId}`;
}

export async function fetchSnkrdunkApparelSnapshot(
  apparelId: number,
): Promise<SnkrdunkApparelSnapshot | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;

  const url = snkrdunkApparelUrl(apparelId);
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
      'User-Agent': 'PokefestaBot/1.0 (+https://pokefesta.app)',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[snkrdunk] product page fetch failed', res.status, text.slice(0, 200));
    return null;
  }

  return parseSnkrdunkApparelPage(apparelId, await res.text());
}

export function parseSnkrdunkApparelPage(
  apparelId: number,
  html: string,
): SnkrdunkApparelSnapshot {
  const dataLayer = extractDataLayerItem(html);
  const displayPrice = readAttr(html, 'apparel-summary-used-min-price');
  const displayListingCount = readAttr(html, 'apparel-summary-used-listing-count');

  return {
    apparelId,
    source: 'snkrdunk-public-page',
    url: dataLayer?.item_url ?? snkrdunkApparelUrl(apparelId),
    name: dataLayer?.item_name ?? readMeta(html, 'og:title'),
    sku: dataLayer?.item_sku_id ?? null,
    imageUrl: dataLayer?.item_image_url ?? readMeta(html, 'og:image'),
    currency: 'JPY',
    minPrice: parseYen(displayPrice),
    displayPrice,
    listingCount: parseCount(displayListingCount),
    displayListingCount,
    fetchedAt: new Date().toISOString(),
  };
}

function readAttr(html: string, name: string): string | null {
  const escapedName = escapeRegExp(name);
  const match = html.match(new RegExp(`${escapedName}="([^"]*)"`, 'i'));
  return match ? decodeHtml(match[1]).trim() : null;
}

function readMeta(html: string, property: string): string | null {
  const escapedProperty = escapeRegExp(property);
  const match = html.match(
    new RegExp(`<meta[^>]+property=["']${escapedProperty}["'][^>]+content=["']([^"']+)["']`, 'i'),
  );
  return match ? decodeHtml(match[1]).trim() : null;
}

function extractDataLayerItem(html: string): DataLayerItem | null {
  const match = html.match(/dataLayer\.push\((\{[\s\S]*?\})\);/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(decodeHtml(match[1])) as DataLayerItem;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.error('[snkrdunk] dataLayer parse failed', err);
    return null;
  }
}

function parseYen(value: string | null): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCount(value: string | null): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#43;/g, '+')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
