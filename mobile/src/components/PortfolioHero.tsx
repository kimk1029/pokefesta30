/**
 * 토탈 포트폴리오 hero (모바일) — 홈 메인과 내 컬렉션 상단에서 동일하게 재사용.
 * 클린/다크 = CleanDarkPortfolioHero, 그 외 = 픽셀 보드. 미로그인 시 잠금 오버레이.
 * 데이터(보유/평가액/등락/차트)는 usePortfolioHeroData 훅이 useCollection +
 * /api/me/portfolio 로 계산한다(웹 lib/portfolioHero 와 동일 컨셉).
 */
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { router } from 'expo-router';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { colors } from '@/theme/tokens';
import { useThemeColors, useTheme, useThemeTextVariant } from '@/components/ThemeProvider';
import { isFlatTheme } from '@/lib/theme';
import { isAuthenticated, subscribeSession } from '@/lib/session';
import { useCurrency } from '@/components/CurrencyProvider';
import { usePriceMode } from '@/lib/priceMode';
import { useCollection } from '@/lib/collection';
import { cardKrw } from '@/data/cardvault';
import { fetchPortfolio, type PortfolioSummary } from '@/lib/myApi';

const POINTS = 1280;
const TRADES = 3;

type PortfolioChartMode = 'day' | 'week' | 'month';

interface PortfolioPoint {
  date: string;
  totalJpy: number;
}

const PORTFOLIO_MODE_LABEL: Record<PortfolioChartMode, string> = {
  day: '일',
  week: '주',
  month: '월',
};

const PORTFOLIO_MODE_HELP: Record<PortfolioChartMode, string> = {
  day: '일별 평가액',
  week: '주별 평가액',
  month: '월별 평가액',
};

function computeDailyTotals(cards: Array<{ latestPrice?: number; trend?: number[] }>, days: number): number[] {
  if (days <= 0) return [];
  const out = new Array(days).fill(0);
  for (const c of cards) {
    const t = Array.isArray(c.trend) ? c.trend : [];
    const latest = c.latestPrice ?? 0;
    for (let i = 0; i < days; i++) {
      const tIdxFromEnd = days - 1 - i;
      const tIdx = t.length - 1 - tIdxFromEnd;
      out[i] += tIdx >= 0 && tIdx < t.length ? t[tIdx] : latest;
    }
  }
  return out;
}

function dateKeyShift(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function syntheticPortfolioHistory(values: number[]): PortfolioPoint[] {
  return values.map((totalJpy, i) => ({
    date: dateKeyShift(values.length - 1 - i),
    totalJpy,
  }));
}

function weekKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function aggregatePortfolioHistory(
  history: PortfolioPoint[],
  mode: PortfolioChartMode,
): PortfolioPoint[] {
  if (mode === 'day') return history.slice(-30);
  const limit = mode === 'week' ? 26 : 12;
  const keyOf = mode === 'week'
    ? (point: PortfolioPoint) => weekKey(point.date)
    : (point: PortfolioPoint) => point.date.slice(0, 7);
  const grouped = new Map<string, PortfolioPoint>();
  for (const point of history) {
    grouped.set(keyOf(point), point);
  }
  return Array.from(grouped.values()).slice(-limit);
}

/** 로그인 상태를 반응형으로 구독. */
function useAuthed(): boolean {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  useEffect(() => {
    const sync = () => setAuthed(isAuthenticated());
    const unsub = subscribeSession(sync);
    sync();
    return unsub;
  }, []);
  return authed;
}

interface HeroData {
  authed: boolean;
  serverPortfolio: PortfolioSummary | null;
  totalVal: number;
  changePct: number;
  ownedLen: number;
  gradedLen: number;
  hasAnyPsa10: boolean;
  priceMode: 'single' | 'psa10';
  togglePriceMode: () => void;
  chartData: number[];
  chartMode: PortfolioChartMode;
  setChartMode: (m: PortfolioChartMode) => void;
}

/** hero 표시에 필요한 데이터 — useCollection + 서버 포트폴리오 스냅샷. */
function usePortfolioHeroData(): HeroData {
  const authed = useAuthed();
  const ownedAll = useCollection();
  const owned = ownedAll.filter((c) => !c.favorite);

  const [serverPortfolio, setServerPortfolio] = useState<PortfolioSummary | null>(null);
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    fetchPortfolio()
      .then((d) => alive && d && d.totalCount > 0 && setServerPortfolio(d))
      .catch(() => undefined);
    return () => { alive = false; };
  }, [authed]);

  const { mode: globalPriceMode, toggle: togglePriceMode } = usePriceMode();
  const hasAnyPsa10 = owned.some((c) => (c.pricePsa10 ?? 0) > 0);
  const priceMode: 'single' | 'psa10' = hasAnyPsa10 ? globalPriceMode : 'single';

  const totalVal = owned.reduce((a, c) => a + cardKrw(c, priceMode), 0);
  const prevVal = Math.round(totalVal * 0.88);
  const changePct = prevVal > 0 ? Math.round(((totalVal - prevVal) / prevVal) * 100) : 0;
  const graded = owned.filter((c) => c.grade != null);

  const [chartMode, setChartMode] = useState<PortfolioChartMode>('day');
  const ownedForChart = owned.map((c) => ({
    latestPrice: cardKrw(c, priceMode),
    trend: Array.isArray(c.trend) ? c.trend : [],
  }));
  const realHistory = serverPortfolio?.history ?? [];
  const chartPoints = aggregatePortfolioHistory(
    realHistory.length >= 2 ? realHistory : syntheticPortfolioHistory(computeDailyTotals(ownedForChart, 30)),
    chartMode,
  );
  const chartData = chartPoints.map((point) => point.totalJpy);

  return {
    authed, serverPortfolio, totalVal, changePct,
    ownedLen: owned.length, gradedLen: graded.length,
    hasAnyPsa10, priceMode, togglePriceMode, chartData, chartMode, setChartMode,
  };
}

export function PortfolioHero() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const { theme } = useTheme();
  const flat = isFlatTheme(theme);
  const { format: formatCurrency } = useCurrency();
  const {
    authed, serverPortfolio, totalVal, changePct, ownedLen, gradedLen,
    hasAnyPsa10, priceMode, togglePriceMode, chartData, chartMode, setChartMode,
  } = usePortfolioHeroData();

  const valueText = serverPortfolio ? formatCurrency(serverPortfolio.totalJpy) : `₩${totalVal.toLocaleString()}`;
  const realPct = serverPortfolio?.changePct ?? null;
  const heroPct = realPct != null ? Math.round(realPct) : changePct;

  return (
    <View style={{ marginHorizontal: 14, marginBottom: 6, position: 'relative' }}>
      <View style={authed ? undefined : { opacity: 0.35 }} pointerEvents={authed ? 'auto' : 'none'}>
        {flat ? (
          <CleanDarkPortfolioHero
            dark={theme === 'dark'}
            tc={tc}
            txt={txt}
            value={valueText}
            changePct={heroPct}
            hasAnyPsa10={hasAnyPsa10}
            priceMode={priceMode}
            togglePriceMode={togglePriceMode}
            chartData={chartData}
            chartMode={chartMode}
            setChartMode={setChartMode}
            ownedLen={ownedLen}
            gradedLen={gradedLen}
            points={POINTS}
            trades={TRADES}
          />
        ) : (
          <PixelFrame
            bg={tc.ink2}
            borderWidth={4}
            shadow={6}
            hi="rgba(100,130,255,0.18)"
            lo="rgba(0,0,0,0.55)"
            inner={4}
          >
            <View style={{ padding: 18, paddingBottom: 16, position: 'relative', overflow: 'hidden' }}>
              {/* corner brackets */}
              {(
                [
                  { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2 },
                  { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2 },
                  { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2 },
                  { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2 },
                ] as const
              ).map((pos, i) => (
                <View
                  key={i}
                  pointerEvents="none"
                  style={[{ position: 'absolute', width: 14, height: 14, borderColor: 'rgba(255,210,63,0.5)' }, pos]}
                />
              ))}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <PixelText variant={txt} size={9} color="rgba(255,255,255,0.35)" style={{ letterSpacing: 2 }}>
                  TOTAL PORTFOLIO{hasAnyPsa10 ? ` · ${priceMode === 'psa10' ? 'PSA10' : '싱글'}` : ''}
                </PixelText>
                {hasAnyPsa10 ? (
                  <Pressable
                    onPress={togglePriceMode}
                    style={{ flexDirection: 'row', borderColor: 'rgba(255,210,63,0.6)', borderWidth: 1 }}
                  >
                    {(['single', 'psa10'] as const).map((m) => (
                      <View
                        key={m}
                        style={{ paddingHorizontal: 7, paddingVertical: 3, backgroundColor: priceMode === m ? tc.gold : 'transparent' }}
                      >
                        <PixelText variant={txt} size={8} color={priceMode === m ? tc.ink : 'rgba(255,210,63,0.85)'}>
                          {m === 'single' ? '싱글' : 'PSA10'}
                        </PixelText>
                      </View>
                    ))}
                  </Pressable>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
                <PixelText variant={txt} size={26} color={tc.gold} style={{ letterSpacing: -2, marginRight: 12 }}>
                  {valueText}
                </PixelText>
                <View style={{ paddingBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {(() => {
                      const up = heroPct >= 0;
                      return (
                        <>
                          <View
                            style={{
                              width: 0,
                              height: 0,
                              borderLeftWidth: 5,
                              borderRightWidth: 5,
                              borderBottomWidth: up ? 8 : 0,
                              borderTopWidth: up ? 0 : 8,
                              borderLeftColor: 'transparent',
                              borderRightColor: 'transparent',
                              borderBottomColor: up ? '#22C55E' : 'transparent',
                              borderTopColor: up ? 'transparent' : '#E63946',
                            }}
                          />
                          <PixelText variant={txt} size={11} color={up ? '#22C55E' : '#E63946'}>
                            {up ? '+' : ''}{heroPct}%
                          </PixelText>
                        </>
                      );
                    })()}
                  </View>
                  <PixelText variant={txt} size={9} color="rgba(255,255,255,0.3)" style={{ marginTop: 4 }}>
                    {serverPortfolio?.changePct != null ? 'vs 어제 (KST 정각)' : 'vs 지난주'}
                  </PixelText>
                </View>
              </View>

              {/* Chart — 컬렉션 일별 종합 가격 꺾은선 */}
              <PortfolioLineChart data={chartData} height={64} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PixelText variant={txt} size={9} color="rgba(255,255,255,0.25)">
                  {PORTFOLIO_MODE_HELP[chartMode]}
                </PixelText>
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {(['day', 'week', 'month'] as const).map((mode) => {
                    const on = chartMode === mode;
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => setChartMode(mode)}
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 4,
                          backgroundColor: on ? tc.gold : 'rgba(255,255,255,0.06)',
                          borderColor: on ? tc.ink : 'rgba(255,255,255,0.12)',
                          borderWidth: 1,
                        }}
                      >
                        <PixelText variant={txt} size={9} color={on ? tc.ink : 'rgba(255,255,255,0.35)'}>
                          {PORTFOLIO_MODE_LABEL[mode]}
                        </PixelText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 4 stat chips */}
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[
                  { l: '보유', v: `${ownedLen}장`, c: 'rgba(255,255,255,0.7)' },
                  { l: '그레이딩', v: `${gradedLen}건`, c: '#A78BFA' },
                  { l: '포인트', v: `${POINTS.toLocaleString()}P`, c: tc.gold },
                  { l: '거래', v: `${TRADES}건`, c: '#22C55E' },
                ].map((s) => (
                  <View
                    key={s.l}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      paddingVertical: 9,
                      paddingHorizontal: 4,
                      alignItems: 'center',
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      minWidth: 0,
                    }}
                  >
                    <PixelText variant={txt} size={10} color={s.c} numberOfLines={1} adjustsFontSizeToFit style={{ marginBottom: 5 }}>
                      {s.v}
                    </PixelText>
                    <PixelText variant={txt} size={8} color="rgba(255,255,255,0.3)" numberOfLines={1}>
                      {s.l}
                    </PixelText>
                  </View>
                ))}
              </View>

              {/* 전체 포트폴리오 페이지로 */}
              <Pressable onPress={() => router.push('/my/portfolio' as never)} style={{ marginTop: 10, alignItems: 'flex-end' }}>
                <PixelText variant={txt} size={9} color="rgba(255,210,63,0.75)" style={{ letterSpacing: 0.5 }}>
                  전체 포트폴리오 보기 ▶
                </PixelText>
              </Pressable>
            </View>
          </PixelFrame>
        )}
      </View>
      {!authed && (
        <Pressable
          onPress={() => router.push('/login' as never)}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 18 }}
        >
          <View
            style={{
              backgroundColor: 'rgba(15,23,42,0.92)',
              borderColor: tc.gold,
              borderWidth: 3,
              paddingHorizontal: 18,
              paddingVertical: 14,
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PixelText variant={txt} size={9} color={tc.gold} style={{ letterSpacing: 0.5 }}>
              🔒 PORTFOLIO LOCKED
            </PixelText>
            <PixelText variant="ko" size={12} weight="bold" color={tc.white} style={{ textAlign: 'center', lineHeight: 18 }}>
              로그인하고 나의{'\n'}가치변동을 확인하세요
            </PixelText>
            <PixelText variant={txt} size={9} color={tc.gold} style={{ marginTop: 4, letterSpacing: 0.5 }}>
              👉 TAP TO LOGIN
            </PixelText>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/**
 * 클린(라이트) / 다크(사이버 주식창) 포트폴리오 히어로.
 */
function CleanDarkPortfolioHero({
  dark, tc, txt, value, changePct, hasAnyPsa10, priceMode, togglePriceMode,
  chartData, chartMode, setChartMode, ownedLen, gradedLen, points, trades,
}: {
  dark: boolean;
  tc: typeof colors;
  txt: 'pixel' | 'ko';
  value: string;
  changePct: number;
  hasAnyPsa10: boolean;
  priceMode: 'single' | 'psa10';
  togglePriceMode: () => void;
  chartData: number[];
  chartMode: PortfolioChartMode;
  setChartMode: (m: PortfolioChartMode) => void;
  ownedLen: number;
  gradedLen: number;
  points: number;
  trades: number;
}) {
  const up = changePct >= 0;
  const upColor = up ? tc.red : tc.blu;
  const radius = dark ? 14 : 0;
  const pillBg = up
    ? dark ? 'rgba(255,77,109,0.16)' : 'rgba(242,54,69,0.12)'
    : dark ? 'rgba(54,197,255,0.16)' : 'rgba(47,107,255,0.12)';
  return (
    <View style={{ backgroundColor: tc.paper, borderColor: tc.pap3, borderWidth: 1, borderRadius: radius, overflow: 'hidden' }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <PixelText variant={txt} size={11} weight="bold" color={tc.ink3}>내 포트폴리오 평가액</PixelText>
          {hasAnyPsa10 ? (
            <Pressable onPress={togglePriceMode} style={{ flexDirection: 'row', backgroundColor: tc.pap2, borderColor: tc.pap3, borderWidth: 1 }}>
              {(['single', 'psa10'] as const).map((m) => (
                <View key={m} style={{ paddingHorizontal: 9, paddingVertical: 4, backgroundColor: priceMode === m ? tc.ink : 'transparent' }}>
                  <PixelText variant={txt} size={10} weight="bold" color={priceMode === m ? tc.paper : tc.ink3}>{m === 'single' ? '싱글' : 'PSA10'}</PixelText>
                </View>
              ))}
            </Pressable>
          ) : null}
        </View>
        <PixelText variant={txt} size={30} weight="bold" color={tc.ink} style={{ letterSpacing: -1 }}>{value}</PixelText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <PixelText variant={txt} size={14} weight="bold" color={upColor}>{up ? '▲' : '▼'} {Math.abs(changePct)}%</PixelText>
          <View style={{ backgroundColor: pillBg, paddingHorizontal: 8, paddingVertical: 3 }}>
            <PixelText variant={txt} size={12} weight="bold" color={upColor}>{up ? '+' : ''}{changePct}%</PixelText>
          </View>
          <PixelText variant={txt} size={12} color={tc.ink3}>전체 수익률</PixelText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 2 }}>
        <PixelText variant={txt} size={12} weight="bold" color={tc.ink3}>평가액 추이</PixelText>
        <View style={{ flexDirection: 'row', backgroundColor: tc.pap2, borderColor: tc.pap3, borderWidth: 1 }}>
          {(['day', 'week', 'month'] as const).map((m) => (
            <Pressable key={m} onPress={() => setChartMode(m)} style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: chartMode === m ? (dark ? tc.white : tc.ink) : 'transparent' }}>
              <PixelText variant={txt} size={11} weight="bold" color={chartMode === m ? (dark ? tc.ink : tc.paper) : tc.ink3}>{PORTFOLIO_MODE_LABEL[m]}</PixelText>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8 }}>
        <PortfolioLineChart data={chartData} height={72} variant={dark ? 'dark' : 'clean'} showVolume={dark} />
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: tc.pap3 }}>
        {([
          ['보유', `${ownedLen}장`],
          ['그레이딩', `${gradedLen}건`],
          ['포인트', `${points.toLocaleString()}P`],
          ['거래', `${trades}건`],
        ] as Array<[string, string]>).map(([l, v], i) => (
          <View key={l} style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', borderRightWidth: i < 3 ? 1 : 0, borderRightColor: tc.pap3 }}>
            <PixelText variant={txt} size={15} weight="bold" color={tc.ink} numberOfLines={1} adjustsFontSizeToFit>{v}</PixelText>
            <PixelText variant={txt} size={11} color={tc.ink3} style={{ marginTop: 4 }}>{l}</PixelText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** 모바일 포트폴리오 라인차트 — 컬렉션 일별 종합 가격 꺾은선. data: 오래된→최신. */
function PortfolioLineChart({
  data,
  height = 60,
  variant,
  showVolume = false,
}: {
  data: number[];
  height?: number;
  variant?: 'clean' | 'dark';
  showVolume?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const tc = useThemeColors();
  const flat = variant === 'clean' || variant === 'dark';
  const borderCol = flat ? tc.pap3 : 'rgba(255,255,255,0.1)';

  if (data.length < 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: borderCol }}>
        <PixelText variant={flat ? 'ko' : 'pixel'} size={flat ? 11 : 9} color={flat ? tc.ink3 : 'rgba(255,255,255,0.35)'}>
          시세 이력이 부족합니다
        </PixelText>
      </View>
    );
  }

  const pad = 4;
  const W = Math.max(width, 1);
  const innerW = Math.max(W - pad * 2, 1);
  const innerH = height - pad * 2;
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const stepX = innerW / (data.length - 1);
  const xOf = (i: number) => pad + i * stepX;
  const yOf = (v: number) => pad + innerH - ((v - minV) / range) * innerH;

  const points = data.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const area = [
    `M${pad},${pad + innerH}`,
    ...data.map((v, i) => `L${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`),
    `L${pad + innerW},${pad + innerH}`,
    'Z',
  ].join(' ');

  const lastV = data[data.length - 1];
  const lastX = xOf(data.length - 1);
  const lastY = yOf(lastV);
  const trendUp = lastV >= data[0];
  const stroke =
    variant === 'clean'
      ? trendUp ? '#F23645' : '#2F6BFF'
      : variant === 'dark'
        ? trendUp ? '#FF4D6D' : '#36C5FF'
        : trendUp ? colors.gold : colors.red;
  const fill =
    variant === 'clean'
      ? trendUp ? 'rgba(242,54,69,0.14)' : 'rgba(47,107,255,0.12)'
      : variant === 'dark'
        ? trendUp ? 'rgba(255,77,109,0.20)' : 'rgba(54,197,255,0.18)'
        : trendUp ? 'rgba(255,210,63,0.22)' : 'rgba(230,57,70,0.18)';
  const dotStroke = flat ? '#FFFFFF' : colors.ink;

  const vols = showVolume ? data.map((v, i) => (i === 0 ? 0 : Math.abs(v - data[i - 1]))) : [];
  const vmax = Math.max(...vols, 1);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: showVolume ? height + 26 : height, borderBottomWidth: 1, borderBottomColor: borderCol, marginBottom: 6 }}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Path d={area} fill={fill} stroke="none" />
          <Polyline points={points} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={lastX} cy={lastY} r={3.2} fill={stroke} stroke={dotStroke} strokeWidth={1} />
        </Svg>
      ) : null}
      {showVolume && width > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 22, gap: 2, marginTop: 4 }}>
          {vols.map((v, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(8, (v / vmax) * 100)}%`,
                backgroundColor: i === vols.length - 1 ? stroke : tc.pap3,
                opacity: i === vols.length - 1 ? 0.9 : 0.55,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
