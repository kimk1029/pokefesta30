import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { CardDetailView, type GradeAgg, type TradeRow } from '@/components/cards/CardDetailView';
import {
  localizeSnkrdunkText,
  type SnkrdunkApparel,
  type SnkrdunkSalesChart,
  type SnkrdunkSalesHistory,
} from '@/lib/snkrdunk';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import { SNKRDUNK_FEATURED_CARDS } from '@/lib/snkrdunkCards';
import { serverFetch } from '@/lib/apiServer';

interface PageProps {
  params: { id: string };
}

const PSA_GRADE_RE = /PSA\s*\d+/i;
const PSA10_RE = /PSA\s*10\b/i;
const PSA9_RE = /PSA\s*9\b/i;

/** 거래내역에서 한 등급의 최근가/평균/최저/건수 집계. (history 는 최신순 전제) */
function gradeAgg(
  history: ReadonlyArray<{ price: number; condition?: string; label?: string }>,
  predicate: (badge: string) => boolean,
  key: string,
): GradeAgg {
  const matches = history
    .filter((h) => typeof h.price === 'number' && h.price > 0)
    .filter((h) => predicate((h.condition || h.label || '').trim()))
    .map((h) => h.price);
  if (matches.length === 0) return { key, recent: 0, avg: 0, low: 0, count: 0 };
  const top5 = matches.slice(0, 5);
  const avg = Math.round(top5.reduce((a, b) => a + b, 0) / top5.length);
  const low = Math.min(...matches.slice(0, 10));
  return { key, recent: matches[0], avg, low, count: matches.length };
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
    gradeAgg(history, (b) => !PSA_GRADE_RE.test(b), 'RAW'),
  ];

  const trades: TradeRow[] = history.slice(0, 40).map((h) => ({
    price: h.price,
    date: localizeSnkrdunkText(h.date),
    badge: (h.condition || localizeSnkrdunkText(h.label) || '').trim(),
  }));

  return (
    <>
      <StatusBar />
      {/* 진입 경로가 다양해 backHref 고정 없이 브라우저 history 로 돌아감. */}
      <AppBar title="시세 상세" showBack />

      <div style={{ height: 14 }} />

      <CardDetailView
        apparelId={apparelId}
        koName={koName}
        jpName={jpName}
        category={seed?.category ?? null}
        imageUrl={apparel.imageUrl ?? null}
        minPrice={apparel.minPrice ?? 0}
        listingCountText={apparel.listingCountText ?? ''}
        productNumber={apparel.productNumber ?? ''}
        grades={grades}
        chartPoints={salesChart?.points ?? []}
        trades={trades}
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
