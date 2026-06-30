import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { JsonLd } from '@/components/JsonLd';
import { absUrl } from '@/lib/seo';
import { CardDetailView, type GradeAgg, type TradeRow } from '@/components/cards/CardDetailView';
import {
  isGradedSnkrdunkBadge,
  localizeSnkrdunkText,
  type SnkrdunkApparel,
  type SnkrdunkSalesChart,
  type SnkrdunkSalesHistory,
} from '@/lib/snkrdunk';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import { gradeAgg } from '@/lib/snkrdunkPrice';
import { SNKRDUNK_FEATURED_CARDS } from '@/lib/snkrdunkCards';
import { serverFetch } from '@/lib/apiServer';
import { parseKreamHints } from '../../../../../shared/util/kreamMatch';

interface PageProps {
  params: { id: string };
}

const PSA10_RE = /PSA\s*10\b/i;
const PSA9_RE = /PSA\s*9\b/i;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const apparelId = Number(params.id);
  if (!Number.isInteger(apparelId) || apparelId <= 0) return { title: '시세 상세' };
  const seed = SNKRDUNK_FEATURED_CARDS.find((c) => c.apparelId === apparelId);
  const r = await serverFetch<{ data: SnkrdunkApparel | null }>(
    `/api/snkrdunk/apparels/${apparelId}`,
    { auth: false },
  );
  const apparel = r.data?.data ?? null;
  if (!apparel) return { title: '시세 상세' };

  const jpName = apparel.localizedName ?? '';
  const koName = seed?.shortName ?? translateKnownCardNameToKo(jpName) ?? jpName;
  const title = `${koName} 시세`;
  const description = `${koName} 포켓몬 카드 실시간 시세 — PSA 등급별 최근가·평균가·시세 추이를 snkrdunk 데이터로 확인하세요.`;
  const ogImage = apparel.imageUrl ?? '/meta.png';
  const canonical = `/cards/snkrdunk/${apparelId}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} · 포케페스타30`,
      description,
      url: canonical,
      images: [{ url: ogImage }],
    },
    twitter: { card: 'summary_large_image', images: [ogImage] },
  };
}

export default async function Page({ params }: PageProps) {
  const apparelId = Number(params.id);
  if (!Number.isInteger(apparelId) || apparelId <= 0) notFound();

  const seed = SNKRDUNK_FEATURED_CARDS.find((c) => c.apparelId === apparelId);
  const base = `/api/snkrdunk/apparels/${apparelId}`;
  const [apparelResp, historyResp, chartResp] = await Promise.all([
    serverFetch<{ data: SnkrdunkApparel | null }>(base, { auth: false }),
    serverFetch<{ data: SnkrdunkSalesHistory | null }>(`${base}/sales-history`, { auth: false }),
    serverFetch<{ data: SnkrdunkSalesChart | null }>(`${base}/sales-chart`, { auth: false }),
  ]);
  const apparel = apparelResp.data?.data ?? null;
  const salesHistory = historyResp.data?.data ?? null;
  const salesChart = chartResp.data?.data ?? null;
  if (!apparel) notFound();

  const jpName = apparel.localizedName ?? '';
  const koName = seed?.shortName ?? translateKnownCardNameToKo(jpName) ?? jpName;
  const history = salesHistory?.history ?? [];

  const grades: GradeAgg[] = [
    gradeAgg(history, (b) => PSA10_RE.test(b), 'PSA 10'),
    gradeAgg(history, (b) => PSA9_RE.test(b), 'PSA 9'),
    // RAW = 비등급만. PSA 외 타 등급사(BGS·CGC 등)·"○以下" 버킷은 제외해 오염 방지.
    gradeAgg(history, (b) => !isGradedSnkrdunkBadge(b), 'RAW'),
  ];

  const trades: TradeRow[] = history.slice(0, 40).map((h) => ({
    price: h.price,
    date: localizeSnkrdunkText(h.date),
    badge: (h.condition || localizeSnkrdunkText(h.label) || '').trim(),
  }));

  const minPrice = apparel.minPrice ?? 0;

  // KREAM 매칭 정확도용 힌트 — 카드명(일/한)·상품번호에서 setCode/번호/등급 추출.
  const kreamHints = parseKreamHints(jpName, koName, apparel.productNumber);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: `${koName} 포켓몬 카드`,
          ...(jpName ? { alternateName: jpName } : {}),
          ...(apparel.imageUrl ? { image: [absUrl(apparel.imageUrl)] } : {}),
          ...(minPrice > 0
            ? {
                offers: {
                  '@type': 'Offer',
                  price: minPrice,
                  priceCurrency: 'JPY',
                  availability: 'https://schema.org/InStock',
                  url: absUrl(`/cards/snkrdunk/${apparelId}`),
                },
              }
            : {}),
        }}
      />
      <StatusBar />
      {/* 진입 경로가 다양해 backHref 고정 없이 브라우저 history 로 돌아감. */}
      <AppBar title="시세 상세" showBack />

      <div style={{ height: 14 }} />

      <CardDetailView
        apparelId={apparelId}
        koName={koName}
        jpName={jpName}
        category={seed?.category ?? null}
        imageUrl={apparel.cdnImageUrl ?? apparel.imageUrl ?? null}
        minPrice={apparel.minPrice ?? 0}
        listingCountText={apparel.listingCountText ?? ''}
        productNumber={apparel.productNumber ?? ''}
        grades={grades}
        chartPoints={salesChart?.points ?? []}
        trades={trades}
        kreamCardNumber={kreamHints.cardNumber}
        kreamSetCode={kreamHints.setCode}
        kreamRarity={kreamHints.rarity}
      />

      <div style={{ height: 40 }} />
      <div
        style={{
          margin: '0 var(--gap)',
          padding: '10px 12px',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink3)',
          textAlign: 'center',
          letterSpacing: 0.3,
          lineHeight: 1.6,
        }}
      >
        시세 정보는 snkrdunk.com 데이터 기반(10분 캐시)이며 실시간으로 변동될 수 있습니다.
        <br />
        <Link href="/cards/snkrdunk" style={{ color: 'var(--blu)' }}>
          ← 전체 시세 목록
        </Link>
      </div>
      <div style={{ height: 60 }} />
    </>
  );
}
