import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, View, Pressable, Text, TextInput } from 'react-native';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { AppBar, ABtn } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { SectHd } from '@/components/cv/SectHd';
import { Chip } from '@/components/cv/Chip';
import { RarBadge } from '@/components/cv/RarBadge';
import { GradeBadge } from '@/components/cv/GradeBadge';
import { colors } from '@/theme/tokens';
import { useThemeColors, useTheme, useThemeTextVariant } from '@/components/ThemeProvider';
import { isFlatTheme } from '@/lib/theme';
import { isAuthenticated, subscribeSession } from '@/lib/session';

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
import { RARS, gameColors, fmt, priceLabel, displayCardName, inferCardCurrency, cardKrw, cardJpy, cardPrice, type Game, type Rarity } from '@/data/cardvault';
import { updateCard, useCollection } from '@/lib/collection';
import { usePriceMode } from '@/lib/priceMode';
import { useCurrency } from '@/components/CurrencyProvider';
import { fetchPortfolio, type PortfolioSummary } from '@/lib/myApi';
import {
  fetchSnkrdunkApparel,
  fetchSnkrdunkBrowse,
  fetchSnkrdunkSalesHistory,
  recentTransactionMedian,
  recoverSnkrdunkApparelId,
  SNKRDUNK_FEATURED_CARDS,
  type SnkrdunkApparel,
  type SnkrdunkCardSeed,
} from '@/services/snkrdunk';
// PackHitsRow 섹션 제거됨 — 웹 메인과 동일 구조로 정렬

const SNKR_CAT_BG: Record<SnkrdunkCardSeed['category'], string> = {
  SAR: colors.orn,
  프로모: colors.pur,
  SR: colors.red,
  원피스: colors.grnDk,
};

interface SnkrDisplaySeed {
  apparelId: number;
  shortName: string;
  category: SnkrdunkCardSeed['category'] | null;
}

interface SnkrRow {
  seed: SnkrDisplaySeed;
  data: SnkrdunkApparel | null;
}

const FEATURED_BY_ID = new Map(SNKRDUNK_FEATURED_CARDS.map((s) => [s.apparelId, s]));

function inferSnkrCategory(name: string): SnkrdunkCardSeed['category'] | null {
  if (/プロモ|PROMO/i.test(name)) return '프로모';
  if (/\bSAR\b/.test(name)) return 'SAR';
  if (/\bSR\b/.test(name)) return 'SR';
  return null;
}

function shortenSnkrName(name: string): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > 22 ? cut.slice(0, 21) + '…' : cut;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const POINTS = 1280;
const LEVEL_LABEL = 'LV.12 다이아 컬렉터';
const XP_CURRENT = 340;
const XP_MAX = 500;
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

/**
 * 컬렉션 일별 종합 가격을 계산. 카드별 trend[](최근 N일 평균 시세)을 합산.
 * trend 가 짧으면 latestPrice 로 채움. 오래된→최신 순서.
 */
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

const ACTIVITY: { icon: string; c: string; txt: string; time: string; pt: string }[] = [
  { icon: '🔥', c: colors.grn, txt: '리자몽 EX 가격 ▲ +8%', time: '10분 전', pt: '+5P' },
  { icon: '📷', c: colors.blu, txt: '카이바 슈라이 스캔 완료', time: '1시간 전', pt: '+10P' },
  { icon: '🤝', c: colors.gold, txt: '피카츄 VMAX 거래 완료', time: '3시간 전', pt: '+15P' },
  { icon: '⭐', c: colors.pur, txt: '레벨업! LV.12 달성', time: '어제', pt: '+50P' },
];

export default function Home() {
  const authed = useAuthed();
  const tc = useThemeColors();
  const { theme } = useTheme();
  const flat = isFlatTheme(theme);
  const txt = useThemeTextVariant();
  const { format: formatCurrency } = useCurrency();
  const [chartMode, setChartMode] = useState<PortfolioChartMode>('day');
  const [activeGame, setActiveGame] = useState<string>('전체');
  const [homeSearch, setHomeSearch] = useState('');
  // 관심 카드(favorite=true)는 포트폴리오 합계 / 차트 / 통계에서 제외.
  const ownedAll = useCollection();
  const owned = ownedAll.filter((c) => !c.favorite);

  // 서버 일별 스냅샷 (KST 정각 reset) — totalJpy / changePct / history.
  // 인증 시에만 동작. 미인증 / 실패 시 폴백으로 로컬 useCollection 사용.
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
  // Force singles when no card in the collection has any PSA10 data —
  // the toggle isn't shown in that case but we still want totals to use
  // singles consistently.
  const hasAnyPsa10 = owned.some((c) => (c.pricePsa10 ?? 0) > 0);
  const priceMode = hasAnyPsa10 ? globalPriceMode : 'single';
  // Portfolio totals always in KRW — JPY entries (snkrdunk-matched cards)
  // are converted via toKrw() so they don't get summed at face value. The
  // global priceMode picks singles vs PSA-10 medians per card.
  const totalVal = owned.reduce((a, c) => a + cardKrw(c, priceMode), 0);
  // 통화-반영 표시용 합계(JPY). format() 가 엔/원 설정에 맞게 변환한다.
  const totalJpy = owned.reduce((a, c) => a + cardJpy(c, priceMode), 0);
  const prevVal = Math.round(totalVal * 0.88);
  const changePct = prevVal > 0 ? Math.round(((totalVal - prevVal) / prevVal) * 100) : 0;
  const graded = owned.filter((c) => c.grade != null);
  const topCards = [...owned].sort((a, b) => cardKrw(b, priceMode) - cardKrw(a, priceMode)).slice(0, 3);

  const rarDist = RARS.map((r) => ({ r, n: owned.filter((c) => c.rar === r).length })).filter(
    (x) => x.n > 0,
  );
  const rarMax = Math.max(...rarDist.map((x) => x.n), 1);

  const presentGames = Array.from(new Set(owned.map((c) => c.game))) as Game[];
  const gameDist = presentGames.map((g) => ({
    g,
    n: owned.filter((c) => c.game === g).length,
    val: owned.filter((c) => c.game === g).reduce((a, c) => a + cardJpy(c, priceMode), 0),
  }));

  // 컬렉션 평가액 차트 (오래된→최신). 서버 일별 스냅샷을 일/주/월 종가로 집계.
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
  const gradedPct = owned.length > 0 ? Math.round((graded.length / owned.length) * 100) : 0;

  // Background refresh: for every owned card with a snkrdunkApparelId (or
  // a recoverable signal — imageUrl / promo name pattern), fetch the latest
  // snkrdunk min price and rewrite the stored price. Without this, the
  // portfolio total drifts away from market value because cards keep the
  // price that was current when they were scanned. Recovery uses the
  // precise setCode+number match in recoverSnkrdunkApparelId — sibling
  // prints can't sneak in.
  useEffect(() => {
    let alive = true;
    (async () => {
      const tasks = owned.map(async (c) => {
        if (!alive) return;
        let apparelId = c.snkrdunkApparelId ?? null;
        const looksLikeSnkr =
          apparelId != null ||
          (c.imageUrl && /snkrdunk\.com/i.test(c.imageUrl)) ||
          /\[[A-Za-z]+-P\b|プロモ/.test(c.name ?? '');
        if (!looksLikeSnkr) return;
        if (!apparelId) {
          apparelId = await recoverSnkrdunkApparelId({
            name: c.name,
            set: c.set,
            num: c.num,
            imageUrl: c.imageUrl,
          });
        }
        if (!apparelId) return;
        const [apparel, history] = await Promise.all([
          fetchSnkrdunkApparel(apparelId),
          fetchSnkrdunkSalesHistory(apparelId),
        ]);
        if (!alive) return;
        // Same logic as detail: store BOTH segment medians so the home
        // portfolio total can flip between singles and PSA10 instantly
        // without re-fetching every card.
        const singleP = recentTransactionMedian(history, 'single') ?? apparel?.minPrice ?? 0;
        const psa10P = recentTransactionMedian(history, 'psa10') ?? 0;
        if (singleP <= 0 && psa10P <= 0) return;
        const needsUpdate =
          (singleP > 0 && c.priceSingle !== singleP) ||
          (psa10P > 0 && c.pricePsa10 !== psa10P) ||
          c.priceCurrency !== 'JPY' ||
          c.snkrdunkApparelId !== apparelId;
        if (!needsUpdate) return;
        const patch: Partial<typeof c> = {
          priceCurrency: 'JPY',
          snkrdunkApparelId: apparelId,
        };
        if (singleP > 0) {
          patch.priceSingle = singleP;
          patch.price = singleP;
          patch.trend = [singleP];
        }
        if (psa10P > 0) patch.pricePsa10 = psa10P;
        updateCard(c.id, patch);
      });
      await Promise.allSettled(tasks);
    })();
    return () => { alive = false; };
    // Owned changes drive a re-sync; the price-comparison guards prevent
    // an infinite update loop after the first pass converges.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owned.length]);

  const [snkrRows, setSnkrRows] = useState<SnkrRow[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      // 검색 HTML 풀에서 6장을 매번 다르게 픽. 실패하면 큐레이션된 시드로 폴백.
      const pool = await fetchSnkrdunkBrowse(1);
      const seeds: SnkrDisplaySeed[] =
        pool.length > 0
          ? shuffle(pool)
              .slice(0, 6)
              .map((r) => {
                const curated = FEATURED_BY_ID.get(r.apparelId);
                return curated
                  ? { apparelId: r.apparelId, shortName: curated.shortName, category: curated.category }
                  : {
                      apparelId: r.apparelId,
                      shortName: shortenSnkrName(r.name),
                      category: inferSnkrCategory(r.name),
                    };
              })
          : shuffle(SNKRDUNK_FEATURED_CARDS)
              .slice(0, 6)
              .map((s) => ({ apparelId: s.apparelId, shortName: s.shortName, category: s.category }));

      const rows = await Promise.all(
        seeds.map(async (seed) => ({
          seed,
          data: await fetchSnkrdunkApparel(seed.apparelId),
        })),
      );
      if (alive) setSnkrRows(rows);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submitHomeSearch = () => {
    const q = homeSearch.trim();
    if (!q) return;
    router.push(`/cards/snkrdunk/search?q=${encodeURIComponent(q)}` as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tc.paper }}>
      <AppBar right={<ABtn onPress={() => router.push('/my' as never)}>👤</ABtn>} />
      {/* 다크(주식창): 실시간 인기 티커 바 */}
      {theme === 'dark' && snkrRows.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, backgroundColor: tc.pap2, borderBottomColor: tc.pap3, borderBottomWidth: 1 }}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRightColor: tc.pap3, borderRightWidth: 1 }}>
            <PixelText variant={txt} size={11} weight="bold" color={tc.blu}>🔥 실시간 인기</PixelText>
          </View>
          {snkrRows.slice(0, 8).map(({ seed, data }) => (
            <Pressable
              key={seed.apparelId}
              onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRightColor: tc.pap3, borderRightWidth: 1 }}
            >
              <PixelText variant={txt} size={11} color={tc.ink2} numberOfLines={1} style={{ maxWidth: 92 }}>{seed.shortName}</PixelText>
              <PixelText variant={txt} size={11} weight="bold" color={tc.ink}>
                {data && data.minPrice > 0 ? `¥${data.minPrice.toLocaleString('ja-JP')}` : '—'}
              </PixelText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — 미로그인 시 dim + 로그인 유도 오버레이 */}
        <View style={{ marginHorizontal: 14, marginBottom: 6, position: 'relative' }}>
        <View style={authed ? undefined : { opacity: 0.35 }} pointerEvents={authed ? 'auto' : 'none'}>
        {flat ? (
          <CleanDarkPortfolioHero
            dark={theme === 'dark'}
            tc={tc}
            txt={txt}
            value={serverPortfolio ? formatCurrency(serverPortfolio.totalJpy) : `₩${totalVal.toLocaleString()}`}
            changePct={serverPortfolio?.changePct != null ? Math.round(serverPortfolio.changePct) : changePct}
            hasAnyPsa10={hasAnyPsa10}
            priceMode={priceMode}
            togglePriceMode={togglePriceMode}
            chartData={chartData}
            chartMode={chartMode}
            setChartMode={setChartMode}
            ownedLen={owned.length}
            gradedLen={graded.length}
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
        <View
          style={{
            padding: 18,
            paddingBottom: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
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
            <PixelText
              variant={txt}
              size={9}
              color="rgba(255,255,255,0.35)"
              style={{ letterSpacing: 2 }}
            >
              TOTAL PORTFOLIO{hasAnyPsa10 ? ` · ${priceMode === 'psa10' ? 'PSA10' : '싱글'}` : ''}
            </PixelText>
            {/* Singles / PSA10 toggle — only shown when at least one
                owned card has PSA10 sales data. Tapping flips the global
                mode so every card price + portfolio total flips together. */}
            {hasAnyPsa10 ? (
              <Pressable
                onPress={togglePriceMode}
                style={{ flexDirection: 'row', borderColor: 'rgba(255,210,63,0.6)', borderWidth: 1 }}
              >
                {(['single', 'psa10'] as const).map((m) => (
                  <View
                    key={m}
                    style={{
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      backgroundColor: priceMode === m ? tc.gold : 'transparent',
                    }}
                  >
                    <PixelText
                      variant={txt}
                      size={8}
                      color={priceMode === m ? tc.ink : 'rgba(255,210,63,0.85)'}
                    >
                      {m === 'single' ? '싱글' : 'PSA10'}
                    </PixelText>
                  </View>
                ))}
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
            <PixelText
              variant={txt}
              size={26}
              color={tc.gold}
              style={{ letterSpacing: -2, marginRight: 12 }}
            >
              {serverPortfolio ? formatCurrency(serverPortfolio.totalJpy) : `₩${totalVal.toLocaleString()}`}
            </PixelText>
            <View style={{ paddingBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {(() => {
                  const realPct = serverPortfolio?.changePct ?? null;
                  const pct = realPct != null ? Math.round(realPct) : changePct;
                  const up = pct >= 0;
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
                        {up ? '+' : ''}{pct}%
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
              { l: '보유', v: `${owned.length}장`, c: 'rgba(255,255,255,0.7)' },
              { l: '그레이딩', v: `${graded.length}건`, c: '#A78BFA' },
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
                <PixelText
                  variant={txt}
                  size={10}
                  color={s.c}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ marginBottom: 5 }}
                >
                  {s.v}
                </PixelText>
                <PixelText
                  variant={txt}
                  size={8}
                  color="rgba(255,255,255,0.3)"
                  numberOfLines={1}
                >
                  {s.l}
                </PixelText>
              </View>
            ))}
          </View>

          {/* 전체 포트폴리오 페이지로 */}
          <Pressable
            onPress={() => router.push('/my/portfolio' as never)}
            style={{ marginTop: 10, alignItems: 'flex-end' }}
          >
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
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 18,
            }}
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

        {/* Section: 카드 검색 — 웹 메인과 동일하게 포트폴리오 바로 아래 */}
        <View style={{ marginHorizontal: 14, marginBottom: 6 }}>
          <SectHd title="카드 검색" />
          <PixelFrame borderWidth={3} shadow={5} inner={3}>
            <View
              style={{
                height: 44,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: tc.white,
              }}
            >
              <PixelText variant={txt} size={12} color={tc.ink3} style={{ marginLeft: 12 }}>
                🔍
              </PixelText>
              <TextInput
                value={homeSearch}
                onChangeText={setHomeSearch}
                onSubmitEditing={submitHomeSearch}
                returnKeyType="search"
                inputMode="search"
                placeholder="한국어로 카드 검색 (예: 리자몽, 피카츄)"
                placeholderTextColor={tc.ink4}
                style={{
                  flex: 1,
                  height: '100%',
                  paddingHorizontal: 9,
                  color: tc.ink,
                  fontFamily: 'Galmuri11',
                  fontSize: 11,
                }}
              />
              {homeSearch ? (
                <Pressable
                  onPress={() => setHomeSearch('')}
                  style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
                >
                  <PixelText variant={txt} size={10} color={tc.ink3}>
                    X
                  </PixelText>
                </Pressable>
              ) : null}
              <Pressable
                onPress={submitHomeSearch}
                style={{
                  width: 32,
                  height: 32,
                  marginRight: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tc.ink,
                  borderColor: tc.ink,
                  borderWidth: 1,
                }}
              >
                <PixelText variant={txt} size={12} color={tc.gold}>
                  ▶
                </PixelText>
              </Pressable>
            </View>
          </PixelFrame>
        </View>

        {/* Section: 바로가기 (Quick Actions) */}
        <View style={{ marginHorizontal: 14 }}>
          <SectHd title="바로가기" />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginHorizontal: 14,
            marginBottom: 6,
          }}
        >
          <QuickBtn icon="📷" label="스캔" bg={tc.grn} href="/cards/grading" />
          <QuickBtn icon="¥" label="시세확인" bg={tc.gold} href="/cards/packs" />
          <QuickBtn icon="🔨" label="MVC경매" bg={tc.blu} href="/cards/mvc-auction" />
          <QuickBtn icon={<KoreaMarketIcon />} label="국내마켓" bg={tc.red} href="/cards/bunjang" />
          <QuickBtn icon="🤝" label="거래" bg={tc.grn} href="/trade" />
        </View>

        {/* XP / Level — 웹 메인과 동일하게 항상 표시 */}
        <View style={{ marginHorizontal: 14, marginBottom: 6 }}>
          <PixelFrame bg={tc.white}>
            <View style={{ padding: 13 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 9,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: tc.pur,
                      borderColor: tc.ink,
                      borderWidth: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🏆</Text>
                  </View>
                  <View>
                    <PixelText variant={txt} size={11}>{LEVEL_LABEL}</PixelText>
                    <PixelText variant={txt} size={9} color={tc.ink3} style={{ marginTop: 4 }}>
                      다음 레벨까지 {XP_MAX - XP_CURRENT}P
                    </PixelText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <PixelText variant={txt} size={13} color={tc.goldDk}>
                    🪙{POINTS.toLocaleString()}
                  </PixelText>
                  <PixelText variant={txt} size={9} color={tc.ink3} style={{ marginTop: 3 }}>
                    포인트
                  </PixelText>
                </View>
              </View>
              <View
                style={{
                  height: 12,
                  backgroundColor: tc.pap3,
                  borderColor: tc.ink,
                  borderWidth: 2,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${Math.round((XP_CURRENT / XP_MAX) * 100)}%`,
                    height: '100%',
                    backgroundColor: tc.pur,
                  }}
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: 3,
                    width: `${Math.round((XP_CURRENT / XP_MAX) * 100)}%`,
                    backgroundColor: 'rgba(255,255,255,0.4)',
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                <PixelText variant={txt} size={9} color={tc.ink3}>
                  {XP_CURRENT} / {XP_MAX} XP
                </PixelText>
                <PixelText variant={txt} size={9} color={tc.pur}>
                  +80XP 이번 주
                </PixelText>
              </View>
            </View>
          </PixelFrame>
        </View>

        {/* Section: 핵심 지표 */}
        <View style={{ marginHorizontal: 14 }}>
          <SectHd title="핵심 지표" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 14, marginBottom: 6 }}>
          <Block label="컬렉션 가치" value={formatCurrency(serverPortfolio?.totalJpy ?? totalJpy)} sub={`▲ +${changePct}% 지난주`} color={tc.goldDk} icon="💰" />
          <Block label="그레이딩률" value={`${gradedPct}%`} sub={`${graded.length} / ${owned.length}장`} color={tc.pur} icon="🏆" />
          <Block label="최고가 카드" value={formatCurrency(topCards[0] ? cardJpy(topCards[0], priceMode) : 0)} sub={topCards[0] ? displayCardName(topCards[0].name) : undefined} color={tc.grnDk} icon="🎯" />
          <Block label="이번주 거래" value={`${TRADES}건`} sub="+45P 포인트 획득" color={tc.blu} icon="🤝" onPress={() => router.push('/feed' as never)} />
        </View>

        {/* Section: 게임별 현황 */}
        <View style={{ marginHorizontal: 14 }}>
          <SectHd title="게임별 현황" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 6 }}
          style={{ marginBottom: 10 }}
        >
          {(['전체', ...presentGames] as string[]).map((g) => {
            const on = activeGame === g;
            const bg = on ? tc.ink : g !== '전체' ? gameColors[g as Game] : tc.white;
            const fg = on ? tc.gold : g !== '전체' ? tc.white : tc.ink;
            return (
              <Chip key={g} on={on} onPress={() => setActiveGame(g)} bg={bg} fg={fg} size={9} px={11} py={6}>
                {g === '전체' ? 'ALL' : g}
              </Chip>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 14, marginBottom: 6 }}>
          {(activeGame === '전체' ? gameDist : gameDist.filter((x) => x.g === activeGame)).map(({ g, n, val }) => {
            const pct = owned.length > 0 ? Math.round((n / owned.length) * 100) : 0;
            const gGraded = owned.filter((c) => c.game === g && c.grade != null).length;
            return (
              <View key={g} style={{ width: '48%' }}>
                <PixelFrame>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      height: 138,
                      borderTopWidth: 4,
                      borderTopColor: gameColors[g],
                    }}
                  >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <PixelText variant={txt} size={12} style={{ flex: 1 }}>
                      {g}
                    </PixelText>
                    <PixelText variant={txt} size={11} color={tc.ink3}>
                      {pct}%
                    </PixelText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
                    <PixelText variant={txt} size={20} style={{ letterSpacing: -1 }}>
                      {n}
                    </PixelText>
                    <PixelText variant={txt} size={11} color={tc.ink3} style={{ marginLeft: 4 }}>
                      장
                    </PixelText>
                  </View>
                  <PixelText variant={txt} size={11} color={tc.grnDk} style={{ marginBottom: 8 }}>
                    {formatCurrency(val)}
                  </PixelText>
                  <View style={{ flexDirection: 'row', height: 8 }}>
                    {RARS.map((r) => {
                      const rn = owned.filter((c) => c.game === g && c.rar === r).length;
                      if (!rn) return null;
                      return <View key={r} style={{ flex: rn, backgroundColor: rarColor(r) }} />;
                    })}
                  </View>
                  {gGraded > 0 ? (
                    <PixelText variant={txt} size={9} color={tc.goldDk} style={{ marginTop: 6 }}>
                      🏆 그레이딩 {gGraded}건
                    </PixelText>
                  ) : null}
                </View>
                </PixelFrame>
              </View>
            );
          })}
        </View>

        {/* Section: 🔥 인기 카드들 / 다크=실시간 시세 종목 리스트 (snkrdunk) */}
        {snkrRows.length > 0 && (theme === 'dark' ? (
          <View style={{ marginHorizontal: 14, marginBottom: 6 }}>
            <SectHd title="실시간 시세" more="전체보기 →" onMore={() => router.push('/cards/snkrdunk' as never)} />
            <View style={{ backgroundColor: tc.white, borderColor: tc.pap3, borderWidth: 1, borderRadius: 14, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: tc.pap2, borderBottomColor: tc.pap3, borderBottomWidth: 1 }}>
                <PixelText variant={txt} size={9} color={tc.ink4} style={{ width: 18, textAlign: 'center' }}>#</PixelText>
                <PixelText variant={txt} size={9} color={tc.ink4} style={{ flex: 1 }}>카드명</PixelText>
                <PixelText variant={txt} size={9} color={tc.ink4}>현재가</PixelText>
              </View>
              {snkrRows.slice(0, 10).map(({ seed, data }, i, arr) => (
                <Pressable
                  key={seed.apparelId}
                  onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomColor: tc.pap3, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }}
                >
                  <PixelText variant={txt} size={12} weight="bold" color={i < 3 ? tc.red : tc.ink4} style={{ width: 18, textAlign: 'center' }}>{i + 1}</PixelText>
                  <View style={{ width: 34, height: 46, borderRadius: 6, overflow: 'hidden', backgroundColor: tc.pap2, alignItems: 'center', justifyContent: 'center' }}>
                    {data?.imageUrl ? (
                      <Image source={{ uri: data.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 16 }}>🃏</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PixelText variant={txt} size={13} weight="bold" color={tc.ink} numberOfLines={1}>{seed.shortName}</PixelText>
                    <PixelText variant={txt} size={10} color={tc.ink3} numberOfLines={1} style={{ marginTop: 3 }}>
                      {(seed.category ?? '카드')}{data?.listingCountText ? ` · 매물 ${data.listingCountText}건` : ''}
                    </PixelText>
                  </View>
                  <PixelText variant={txt} size={13} weight="bold" color={tc.ink}>
                    {data && data.minPrice > 0 ? `¥${data.minPrice.toLocaleString('ja-JP')}` : '—'}
                  </PixelText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            <View style={{ marginHorizontal: 14 }}>
              <SectHd
                title="🔥 인기 카드들"
                more="전체보기 →"
                onMore={() => router.push('/cards/snkrdunk' as never)}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 6 }}
              style={{ marginBottom: 6 }}
            >
              {snkrRows.map(({ seed, data }) => {
                const bg = seed.category ? SNKR_CAT_BG[seed.category] : tc.ink2;
                const priceText =
                  data && data.minPrice > 0 ? `¥${data.minPrice.toLocaleString('ja-JP')}` : '—';
                return (
                  <View key={seed.apparelId} style={{ width: 128 }}>
                    <PixelPress
                      onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}
                      innerStyle={{ borderTopWidth: 4, borderTopColor: bg, height: 196 }}
                    >
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            height: 92,
                            backgroundColor: tc.pap2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {data?.imageUrl ? (
                            <Image
                              source={{ uri: data.imageUrl }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={{ fontSize: 28 }}>🃏</Text>
                          )}
                        </View>
                        <View
                          style={{
                            padding: 8,
                            borderTopColor: tc.ink,
                            borderTopWidth: 3,
                            flex: 1,
                          }}
                        >
                          <View style={{ height: 18, marginBottom: 4 }}>
                            {seed.category ? (
                              <View
                                style={{
                                  alignSelf: 'flex-start',
                                  backgroundColor: bg,
                                  paddingHorizontal: 4,
                                  paddingVertical: 2,
                                  borderColor: tc.ink,
                                  borderWidth: 1,
                                }}
                              >
                                <PixelText variant={txt} size={8} color={tc.white}>
                                  {seed.category}
                                </PixelText>
                              </View>
                            ) : null}
                          </View>
                          <PixelText
                            variant={txt}
                            size={9}
                            numberOfLines={1}
                            style={{ marginBottom: 4 }}
                          >
                            {seed.shortName}
                          </PixelText>
                          <PixelText variant={txt} size={10} color={tc.red} numberOfLines={1}>
                            {priceText}
                          </PixelText>
                          <PixelText
                            variant={txt}
                            size={8}
                            color={tc.ink3}
                            numberOfLines={1}
                            style={{ marginTop: 'auto' }}
                          >
                            {data?.listingCountText ? `매물 ${data.listingCountText}건` : ' '}
                          </PixelText>
                        </View>
                      </View>
                    </PixelPress>
                  </View>
                );
              })}
            </ScrollView>
          </>
        ))}

        {/* Section: 최근 활동 */}
        <View style={{ marginHorizontal: 14 }}>
          <SectHd title="최근 활동" />
        </View>
        <View style={{ marginHorizontal: 14, marginBottom: 6 }}>
          <PixelFrame bg={tc.white}>
            <View style={{ padding: 14, paddingBottom: 6 }}>
              {ACTIVITY.map((a, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 10,
                    borderBottomWidth: i < ACTIVITY.length - 1 ? 2 : 0,
                    borderBottomColor: tc.pap3,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: a.c,
                      borderColor: tc.ink,
                      borderWidth: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{a.icon}</Text>
                  </View>
                  <PixelText variant={txt} size={10} style={{ flex: 1, lineHeight: 15 }}>
                    {a.txt}
                  </PixelText>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <PixelText variant={txt} size={10} color={tc.goldDk}>
                      {a.pt}
                    </PixelText>
                    <PixelText variant={txt} size={9} color={tc.ink3}>
                      {a.time}
                    </PixelText>
                  </View>
                </View>
              ))}
            </View>
          </PixelFrame>
        </View>

      </ScrollView>
    </View>
  );
}

function rarColor(r: Rarity): string {
  return r === 'C' ? '#475569'
    : r === 'U' ? '#22C55E'
    : r === 'R' ? '#3A5BD9'
    : r === 'SR' ? '#7C3AED'
    : r === 'HR' ? '#EC4899'
    : '#FFD23F';
}

function Block({
  label,
  value,
  sub,
  color,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: string;
  onPress?: () => void;
}) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const content = (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 14,
        height: 88,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {icon ? (
        <Text
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            fontSize: 18,
            opacity: 0.15,
          }}
        >
          {icon}
        </Text>
      ) : null}
      <PixelText variant={txt} size={10} color={tc.ink3} numberOfLines={1}>
        {label}
      </PixelText>
      <PixelText
        variant={txt}
        size={18}
        color={color ?? tc.ink}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ letterSpacing: -1, marginVertical: 5 }}
      >
        {value}
      </PixelText>
      {sub ? (
        <PixelText variant={txt} size={9} color={tc.ink3} numberOfLines={1}>
          {sub}
        </PixelText>
      ) : null}
    </View>
  );
  return (
    <View style={{ width: '48%' }}>
      {onPress ? (
        <PixelPress onPress={onPress}>{content}</PixelPress>
      ) : (
        <PixelFrame>{content}</PixelFrame>
      )}
    </View>
  );
}

function KoreaMarketIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Rect x={3} y={7} width={16} height={12} fill={colors.ink} />
      <Rect x={5} y={9} width={12} height={8} fill={colors.white} />
      <Rect x={7} y={4} width={8} height={3} fill={colors.ink} />
      <Rect x={8} y={2} width={6} height={3} fill={colors.white} />
      <Rect x={9} y={11} width={4} height={4} fill={colors.red} />
      <Rect x={11} y={13} width={4} height={4} fill={colors.blu} />
      <Rect x={6} y={11} width={2} height={2} fill={colors.ink} />
      <Rect x={15} y={14} width={2} height={2} fill={colors.ink} />
    </Svg>
  );
}

function QuickBtn({ icon, label, bg, href }: { icon: ReactNode; label: string; bg: string; href: string }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={{ width: '19%' }}>
      <PixelPress onPress={() => router.push(href as never)} borderWidth={3} shadow={5} inner={3}>
        <View style={{ paddingVertical: 8, paddingHorizontal: 0, alignItems: 'center', gap: 5, minWidth: 0 }}>
          <View
            style={{
              width: 32,
              height: 32,
              backgroundColor: bg,
              borderColor: tc.ink,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {typeof icon === 'string' ? <Text style={{ fontSize: 17 }}>{icon}</Text> : icon}
          </View>
          <PixelText variant={txt} size={9} color={tc.ink} numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'center' }}>
            {label}
          </PixelText>
        </View>
      </PixelPress>
    </View>
  );
}



/**
 * 클린(라이트) / 다크(사이버 주식창) 포트폴리오 히어로 — 웹 프로토타입 이식.
 * 평가액 + 싱글/PSA10 토글 + ▲/▼ 손익(상승=빨강·하락=파랑/시안) + 기간토글
 * + 라인차트(다크=네온+거래량) + 4칸 지표 스트립.
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

/**
 * 모바일 포트폴리오 라인차트 — 컬렉션 일별 종합 가격 꺾은선.
 * react-native-svg 로 폴리라인 + 영역 채움. data: 오래된→최신.
 */
function PortfolioLineChart({
  data,
  height = 60,
  variant,
  showVolume = false,
}: {
  data: number[];
  height?: number;
  /** 'clean'=빨강/파랑 · 'dark'=네온 빨강/시안 · undefined=픽셀(골드/빨강) */
  variant?: 'clean' | 'dark';
  showVolume?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const tc = useThemeColors();
  const flat = variant === 'clean' || variant === 'dark';
  const borderCol = flat ? tc.pap3 : 'rgba(255,255,255,0.1)';

  if (data.length < 2) {
    return (
      <View
        style={{
          height,
          alignItems: 'center',
          justifyContent: 'center',
          borderBottomWidth: 1,
          borderBottomColor: borderCol,
        }}
      >
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

  // 거래량 막대(다크 주식창) — 일별 변동폭 기반.
  const vols = showVolume ? data.map((v, i) => (i === 0 ? 0 : Math.abs(v - data[i - 1]))) : [];
  const vmax = Math.max(...vols, 1);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        height: showVolume ? height + 26 : height,
        borderBottomWidth: 1,
        borderBottomColor: borderCol,
        marginBottom: 6,
      }}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Path d={area} fill={fill} stroke="none" />
          <Polyline
            points={points}
            fill="none"
            stroke={stroke}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
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
