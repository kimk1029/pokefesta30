/**
 * 자산 요약(7일/30일/누적) + 가격 알림 배너 — 내 컬렉션 상단.
 * 웹 CollectionScreen 의 "자산 요약" 섹션 + "가격 알림" 배너 모바일 포팅. 모두 실데이터.
 *  - 7일/30일 변화: 서버 포트폴리오 history(일별 평가액) 델타.
 *  - 누적 수익률: 보유 카드 매입가(basis) 대비 현재가 합.
 */
import { useMemo } from 'react';
import { View } from 'react-native';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { space } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import type { MyCardRow, PortfolioSummary } from '@/lib/myApi';

interface Delta {
  abs: number;
  pct: number;
}

export function CollectionSummary({
  port,
  cards,
  priceMode,
  alertCount,
  format,
  rate,
}: {
  port: PortfolioSummary | null;
  cards: MyCardRow[];
  priceMode: 'single' | 'psa10';
  alertCount: number;
  format: (jpy: number) => string;
  rate: number;
}) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const usePsa10 = priceMode === 'psa10';

  // 7일/30일 변화 — 서버 history 기준 (웹 over(days) 와 동일).
  const summary = useMemo(() => {
    const h = port?.history ?? [];
    const over = (days: number): Delta | null => {
      if (h.length < 2) return null;
      const last = h[h.length - 1].totalJpy;
      const base = h[Math.max(0, h.length - 1 - days)].totalJpy;
      if (!base) return null;
      return { abs: last - base, pct: ((last - base) / base) * 100 };
    };
    return { d7: over(7), d30: over(30) };
  }, [port]);

  // 누적 수익률 — 매입가 입력 카드의 basis 대비 현재가 (웹 totals 와 동일).
  const totals = useMemo(() => {
    let invested = 0;
    let current = 0;
    for (const c of cards) {
      const cur = usePsa10 && (c.pricePsa10Jpy ?? 0) > 0 ? (c.pricePsa10Jpy as number) : (c.priceSingleJpy ?? 0);
      const qty = Math.max(1, c.qty ?? 1);
      const basis =
        c.buyPrice != null && c.buyPrice > 0
          ? c.buyCurrency === 'JPY'
            ? c.buyPrice
            : c.buyPrice / (rate || 1)
          : null;
      if (basis && cur > 0) {
        invested += basis * qty;
        current += cur * qty;
      }
    }
    const profit = current - invested;
    const pct = invested > 0 ? (profit / invested) * 100 : null;
    return { profit, pct };
  }, [cards, usePsa10, rate]);

  return (
    <>
      {/* 자산 요약 */}
      <View style={{ paddingHorizontal: space.gap, marginBottom: space.cg }}>
        <PixelText variant="ko" size={15} weight="bold" color={tc.ink} style={{ marginBottom: 10 }}>
          자산 요약
        </PixelText>
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <SummaryCell tc={tc} txt={txt} label="7일 변화" delta={summary.d7} format={format} />
          <SummaryCell tc={tc} txt={txt} label="30일 변화" delta={summary.d30} format={format} />
          <SummaryCell
            tc={tc}
            txt={txt}
            label="누적 수익률"
            pctOnly={totals.pct}
            sub={totals.pct != null ? `${totals.profit >= 0 ? '+' : '-'}${format(Math.abs(totals.profit))}` : undefined}
            format={format}
          />
        </View>
      </View>

      {/* 가격 알림 배너 */}
      <View style={{ paddingHorizontal: space.gap, marginBottom: space.cg }}>
        <PixelFrame bg={tc.white}>
          <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <PixelText variant={txt} size={22}>🎯</PixelText>
            <View style={{ flex: 1, minWidth: 0 }}>
              <PixelText variant="ko" size={13} weight="bold" color={tc.ink}>가격 알림</PixelText>
              <PixelText variant={txt} size={9} color={tc.ink3} style={{ marginTop: 3, lineHeight: 13 }}>
                원하는 카드의 가격 변동을 알림으로 받아보세요.
              </PixelText>
            </View>
            {alertCount > 0 ? (
              <PixelText variant={txt} size={10} weight="bold" color={tc.orn}>{alertCount}개 설정 중</PixelText>
            ) : null}
          </View>
        </PixelFrame>
      </View>
    </>
  );
}

function SummaryCell({
  tc,
  txt,
  label,
  delta,
  pctOnly,
  sub,
  format,
}: {
  tc: ReturnType<typeof useThemeColors>;
  txt: 'pixel' | 'ko';
  label: string;
  delta?: Delta | null;
  pctOnly?: number | null;
  sub?: string;
  format: (jpy: number) => string;
}) {
  const pct = delta ? delta.pct : pctOnly ?? null;
  const color = pct == null ? tc.ink3 : pct >= 0 ? tc.red : tc.blu;
  const main = delta
    ? `${delta.abs >= 0 ? '+' : '-'}${format(Math.abs(delta.abs))}`
    : pct != null
      ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
      : '—';
  const subText = delta && pct != null ? `(${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)` : sub;
  return (
    <View style={{ flex: 1, borderColor: tc.pap3, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 10, backgroundColor: tc.white, minHeight: 88 }}>
      <PixelText variant={txt} size={10} color={tc.ink3} numberOfLines={1}>{label}</PixelText>
      <PixelText variant={txt} size={13} weight="bold" color={color} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 7 }}>
        {main}
      </PixelText>
      {subText ? (
        <PixelText variant={txt} size={9} color={tc.ink3} numberOfLines={1} style={{ marginTop: 3 }}>{subText}</PixelText>
      ) : null}
    </View>
  );
}
