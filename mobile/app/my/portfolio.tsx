import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Image, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { useCurrency } from '@/components/CurrencyProvider';
import { usePriceMode } from '@/lib/priceMode';
import { fetchPortfolio, fetchMyCards, type PortfolioSummary, type MyCardRow } from '@/lib/myApi';
import { colors } from '@/theme/tokens';

export default function PortfolioPage() {
  const { format, rate } = useCurrency();
  const { mode: priceMode } = usePriceMode();
  const [port, setPort] = useState<PortfolioSummary | null>(null);
  const [cards, setCards] = useState<MyCardRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selIdx, setSelIdx] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, c] = await Promise.all([fetchPortfolio(), fetchMyCards()]);
        if (!alive) return;
        setPort(p);
        setCards(c);
      } catch {
        if (alive) setErr('포트폴리오를 불러오지 못했어요');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const usePsa10 = priceMode === 'psa10';

  const rows = useMemo(() => {
    if (!cards) return [];
    return cards.map((c) => {
      const curJpy = usePsa10 && (c.pricePsa10Jpy ?? 0) > 0 ? (c.pricePsa10Jpy as number) : c.priceSingleJpy ?? 0;
      const qty = Math.max(1, c.qty || 1);
      const basisJpy =
        c.buyPrice != null && c.buyPrice > 0
          ? c.buyCurrency === 'JPY'
            ? c.buyPrice
            : c.buyPrice / (rate || 1)
          : null;
      const profitPct = basisJpy && curJpy > 0 ? ((curJpy - basisJpy) / basisJpy) * 100 : null;
      const t = c.trend ?? [];
      const dayPct =
        t.length >= 2 && t[t.length - 2] > 0 ? ((t[t.length - 1] - t[t.length - 2]) / t[t.length - 2]) * 100 : null;
      return { c, curJpy, qty, basisJpy, profitPct, dayPct };
    });
  }, [cards, usePsa10, rate]);

  const totals = useMemo(() => {
    let invested = 0;
    let current = 0;
    for (const r of rows) {
      if (r.basisJpy && r.curJpy > 0) {
        invested += r.basisJpy * r.qty;
        current += r.curJpy * r.qty;
      }
    }
    const profit = current - invested;
    const pct = invested > 0 ? (profit / invested) * 100 : null;
    return { invested, current, profit, pct };
  }, [rows]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.push('/my' as never)} title="포트폴리오" />
      {err ? (
        <View style={{ padding: 30, alignItems: 'center' }}>
          <PixelText variant="pixel" size={11} color={colors.red}>⚠ {err}</PixelText>
        </View>
      ) : !port || !cards ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : port.totalCount === 0 ? (
        <View style={{ padding: 30, alignItems: 'center', gap: 12 }}>
          <PixelText variant="pixel" size={11} color={colors.ink3}>아직 보유 카드가 없어요</PixelText>
          <Pressable onPress={() => router.push('/cards/add' as never)}>
            <PixelText variant="pixel" size={11} color={colors.blu}>카드 추가하러 가기 →</PixelText>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 14 }}>
          {/* 평가액 헤더 */}
          {(() => {
            const totalJpy = usePsa10 && (port.totalPsa10Jpy ?? 0) > 0 ? (port.totalPsa10Jpy as number) : port.totalJpy;
            const up = (port.changePct ?? 0) >= 0;
            return (
              <PixelFrame bg={colors.ink} borderWidth={3} shadow={6}>
                <View style={{ padding: 14 }}>
                  <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.5)" style={{ letterSpacing: 0.5 }}>
                    총 평가액 (스니덩크 시세 합계)
                  </PixelText>
                  <PixelText variant="pixel" size={24} color={colors.gold} style={{ marginTop: 6 }}>
                    {format(totalJpy)}
                  </PixelText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {port.changePct != null && (
                      <PixelText variant="pixel" size={12} color={up ? '#22C55E' : '#FF6B7A'}>
                        {up ? '▲ +' : '▼ '}
                        {port.changePct.toFixed(2)}%
                        {port.changeAbsJpy != null ? ` (${up ? '+' : '-'}${format(Math.abs(port.changeAbsJpy))})` : ''}
                      </PixelText>
                    )}
                    <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.45)">
                      {port.pricedCount}/{port.totalCount}장 · 어제(KST)대비
                    </PixelText>
                  </View>
                  {totals.pct != null && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }}>
                      <PixelText variant="pixel" size={10} color="rgba(255,255,255,0.7)" style={{ lineHeight: 16 }}>
                        매입 {format(totals.invested)} → 현재 {format(totals.current)}
                        {`\n`}
                        <PixelText variant="pixel" size={10} color={totals.profit >= 0 ? '#22C55E' : '#FF6B7A'}>
                          {totals.profit >= 0 ? '+' : '-'}
                          {format(Math.abs(totals.profit))} ({totals.profit >= 0 ? '+' : ''}
                          {totals.pct.toFixed(1)}%)
                        </PixelText>
                      </PixelText>
                    </View>
                  )}
                </View>
              </PixelFrame>
            );
          })()}

          {/* 일별 차트 */}
          <PortfolioChart history={port.history} format={format} selIdx={selIdx} onSelect={setSelIdx} />

          {/* 카드별 등락률 */}
          <PixelText variant="pixel" size={11} color={colors.ink2} style={{ letterSpacing: 1 }}>
            보유 카드 등락률 ({rows.length})
          </PixelText>
          <View style={{ gap: 8 }}>
            {rows.map(({ c, curJpy, profitPct, dayPct, basisJpy, qty }) => {
              const img = c.snkrdunkImageUrl || c.photoUrl || null;
              const name = c.snkrdunkName || c.nickname || '이름 미상';
              const changePct = profitPct ?? dayPct;
              const changeUp = (changePct ?? 0) >= 0;
              return (
                <PixelFrame key={c.id} borderWidth={3} shadow={4}>
                  <View style={{ flexDirection: 'row', gap: 10, padding: 10, alignItems: 'center' }}>
                    <View style={{ width: 40, height: 56, borderColor: colors.ink, borderWidth: 2, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {img ? (
                        <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <PixelText variant="pixel" size={18}>🃏</PixelText>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <PixelText variant="ko" size={12} weight="bold" numberOfLines={1}>
                        {name}
                        {c.graded ? `  [${c.gradeCompany ?? 'PSA'} ${c.gradeValue ?? ''}]` : ''}
                      </PixelText>
                      <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: 3 }}>
                        {[c.ocrSetCode?.toUpperCase(), c.ocrCardNumber].filter(Boolean).join(' · ')}
                        {qty > 1 ? ` · ×${qty}` : ''}
                        {c.selfPulled ? ' · 직접뽑기' : ''}
                      </PixelText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <PixelText variant="pixel" size={11}>{curJpy > 0 ? format(curJpy) : '시세없음'}</PixelText>
                      {changePct != null && (
                        <PixelText variant="pixel" size={10} color={changeUp ? colors.grnDk : colors.red} style={{ marginTop: 3 }}>
                          {changeUp ? '▲ +' : '▼ '}
                          {changePct.toFixed(1)}% {basisJpy != null ? '매입' : '전일'}
                        </PixelText>
                      )}
                    </View>
                  </View>
                </PixelFrame>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function PortfolioChart({
  history,
  format,
  selIdx,
  onSelect,
}: {
  history: Array<{ date: string; totalJpy: number }>;
  format: (jpy: number) => string;
  selIdx: number | null;
  onSelect: (i: number | null) => void;
}) {
  if (history.length < 2) {
    return (
      <PixelFrame borderWidth={3} shadow={4}>
        <View style={{ padding: 16, alignItems: 'center' }}>
          <PixelText variant="pixel" size={9} color={colors.ink3}>
            일별 데이터가 2일 이상 쌓이면 차트가 표시돼요
          </PixelText>
        </View>
      </PixelFrame>
    );
  }
  const W = 320;
  const H = 120;
  const PAD = 8;
  const vals = history.map((h) => h.totalJpy);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const step = (W - PAD * 2) / (history.length - 1);
  const xy = (i: number) => ({
    x: PAD + i * step,
    y: H - PAD - ((history[i].totalJpy - min) / span) * (H - PAD * 2),
  });
  const d = history
    .map((_, i) => {
      const { x, y } = xy(i);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const overallUp = vals[vals.length - 1] >= vals[0];
  const stroke = overallUp ? '#22C55E' : '#E63946';

  const sel = selIdx != null && selIdx >= 0 && selIdx < history.length ? selIdx : null;
  const selPrev = sel != null && sel > 0 ? history[sel - 1].totalJpy : null;
  const selPct = sel != null && selPrev && selPrev > 0 ? ((history[sel].totalJpy - selPrev) / selPrev) * 100 : null;

  return (
    <PixelFrame borderWidth={3} shadow={4}>
      <View style={{ padding: 12 }}>
        {sel != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <PixelText variant="pixel" size={10} color={colors.ink3}>{history[sel].date}</PixelText>
            <PixelText variant="pixel" size={14} color={colors.ink}>{format(history[sel].totalJpy)}</PixelText>
            {selPct != null && (
              <PixelText variant="pixel" size={11} color={selPct >= 0 ? colors.grnDk : colors.red}>
                {selPct >= 0 ? '▲ +' : '▼ '}
                {selPct.toFixed(2)}%
              </PixelText>
            )}
          </View>
        ) : (
          <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginBottom: 8 }}>
            차트의 점을 눌러 그 날의 금액·등락률을 확인하세요
          </PixelText>
        )}
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <Path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
          {history.map((_, i) => {
            const { x, y } = xy(i);
            const isSel = i === sel;
            return (
              <Rect
                key={`hit-${i}`}
                x={x - step / 2}
                y={0}
                width={step}
                height={H}
                fill="transparent"
                onPress={() => onSelect(i)}
              />
            );
          })}
          {sel != null && (
            <Line x1={xy(sel).x} y1={0} x2={xy(sel).x} y2={H} stroke={colors.ink3} strokeWidth={1} strokeDasharray="3,3" />
          )}
          {history.map((_, i) => {
            const { x, y } = xy(i);
            const isSel = i === sel;
            return <Circle key={`pt-${i}`} cx={x} cy={y} r={isSel ? 4 : 2} fill={isSel ? colors.ink : stroke} onPress={() => onSelect(i)} />;
          })}
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <PixelText variant="pixel" size={8} color={colors.ink3}>{history[0].date}</PixelText>
          <PixelText variant="pixel" size={8} color={colors.ink3}>최근 {history.length}일</PixelText>
          <PixelText variant="pixel" size={8} color={colors.ink3}>{history[history.length - 1].date}</PixelText>
        </View>
      </View>
    </PixelFrame>
  );
}
