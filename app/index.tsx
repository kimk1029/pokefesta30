import { useEffect, useState } from 'react';
import { Image, ScrollView, View, Pressable, Text } from 'react-native';
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
import { RARS, gameColors, fmt, priceLabel, displayCardName, inferCardCurrency, cardKrw, cardPrice, type Game, type Rarity } from '@/data/cardvault';
import { updateCard, useCollection } from '@/lib/collection';
import { usePriceMode } from '@/lib/priceMode';
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
import { fetchAllPacksWithHits, type PackWithHits } from '@/lib/myApi';

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

const CHARTS: Record<'1W' | '1M' | '3M', number[]> = {
  '1W': [88, 90, 91, 89, 93, 96, 100],
  '1M': [65, 68, 72, 70, 75, 78, 80, 82, 85, 83, 88, 90, 92, 95, 93, 97, 100],
  '3M': [40, 45, 50, 48, 55, 60, 58, 62, 65, 68, 72, 75, 73, 78, 82, 85, 88, 90, 95, 100],
};

const ACTIVITY: { icon: string; c: string; txt: string; time: string; pt: string }[] = [
  { icon: '🔥', c: colors.grn, txt: '리자몽 EX 가격 ▲ +8%', time: '10분 전', pt: '+5P' },
  { icon: '📷', c: colors.blu, txt: '카이바 슈라이 스캔 완료', time: '1시간 전', pt: '+10P' },
  { icon: '🤝', c: colors.gold, txt: '피카츄 VMAX 거래 완료', time: '3시간 전', pt: '+15P' },
  { icon: '⭐', c: colors.pur, txt: '레벨업! LV.12 달성', time: '어제', pt: '+50P' },
];

export default function Home() {
  const [chartPeriod, setChartPeriod] = useState<'1W' | '1M' | '3M'>('1M');
  const [activeGame, setActiveGame] = useState<string>('전체');
  const owned = useCollection();
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
    val: owned.filter((c) => c.game === g).reduce((a, c) => a + cardKrw(c, priceMode), 0),
  }));

  const chartData = CHARTS[chartPeriod];
  const chartMax = Math.max(...chartData);
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

  // 팩별 힛카드 — /api/card-packs 호출. 웹 베이스 URL 미설정 / 오프라인 시 빈 배열.
  const [packs, setPacks] = useState<PackWithHits[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchAllPacksWithHits(12);
        if (alive) setPacks(data);
      } catch {
        if (alive) setPacks([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar right={<ABtn onPress={() => router.push('/my' as never)}>👤</ABtn>} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
        <PixelFrame
          bg={colors.ink2}
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
              variant="pixel"
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
                      backgroundColor: priceMode === m ? colors.gold : 'transparent',
                    }}
                  >
                    <PixelText
                      variant="pixel"
                      size={8}
                      color={priceMode === m ? colors.ink : 'rgba(255,210,63,0.85)'}
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
              variant="pixel"
              size={26}
              color={colors.gold}
              style={{ letterSpacing: -2, marginRight: 12 }}
            >
              ₩{totalVal.toLocaleString()}
            </PixelText>
            <View style={{ paddingBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 5,
                    borderRightWidth: 5,
                    borderBottomWidth: 8,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderBottomColor: '#22C55E',
                  }}
                />
                <PixelText variant="pixel" size={11} color="#22C55E">
                  +{changePct}%
                </PixelText>
              </View>
              <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.3)" style={{ marginTop: 4 }}>
                vs 지난주
              </PixelText>
            </View>
          </View>

          {/* Chart */}
          <View
            style={{
              flexDirection: 'row',
              height: 60,
              alignItems: 'flex-end',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.1)',
              marginBottom: 6,
            }}
          >
            {chartData.map((v, i) => {
              const h = Math.round((v / chartMax) * 100);
              const isLast = i === chartData.length - 1;
              const isHigh = v === chartMax;
              const bg = isLast
                ? colors.gold
                : isHigh
                  ? 'rgba(255,210,63,0.6)'
                  : 'rgba(255,210,63,0.2)';
              return (
                <View key={i} style={{ flex: 1, height: `${h}%`, minHeight: 4, marginHorizontal: 1, backgroundColor: bg }}>
                  {isLast ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -7,
                        left: '50%',
                        marginLeft: -3,
                        width: 6,
                        height: 6,
                        backgroundColor: colors.gold,
                        borderColor: colors.ink,
                        borderWidth: 1,
                      }}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.25)">
              {chartPeriod === '1W' ? '7일' : chartPeriod === '1M' ? '30일' : '90일'} 전
            </PixelText>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {(['1W', '1M', '3M'] as const).map((p) => {
                const on = chartPeriod === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setChartPeriod(p)}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      backgroundColor: on ? colors.gold : 'rgba(255,255,255,0.06)',
                      borderColor: on ? colors.ink : 'rgba(255,255,255,0.12)',
                      borderWidth: 1,
                    }}
                  >
                    <PixelText variant="pixel" size={9} color={on ? colors.ink : 'rgba(255,255,255,0.35)'}>
                      {p}
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
              { l: '포인트', v: `${POINTS.toLocaleString()}P`, c: colors.gold },
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
                  variant="pixel"
                  size={10}
                  color={s.c}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ marginBottom: 5 }}
                >
                  {s.v}
                </PixelText>
                <PixelText
                  variant="pixel"
                  size={8}
                  color="rgba(255,255,255,0.3)"
                  numberOfLines={1}
                >
                  {s.l}
                </PixelText>
              </View>
            ))}
          </View>
        </View>
        </PixelFrame>
        </View>

        {/* Quick Actions (above XP) */}
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 14, marginBottom: 12 }}>
          <QuickBtn icon="📷" label="스캔" bg={colors.grn} href="/scan" />
          <QuickBtn icon="🏷" label="마켓" bg={colors.orn} href="/feed" />
          <QuickBtn icon="🏆" label="그레이딩" bg={colors.pur} href="/scan" />
          <QuickBtn icon="📊" label="시세" bg={colors.blu} href="/cards" />
        </View>

        {/* XP / Level */}
        <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
          <PixelFrame bg={colors.white}>
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
                      backgroundColor: colors.pur,
                      borderColor: colors.ink,
                      borderWidth: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>🏆</Text>
                  </View>
                  <View>
                    <PixelText variant="pixel" size={11}>{LEVEL_LABEL}</PixelText>
                    <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: 4 }}>
                      다음 레벨까지 {XP_MAX - XP_CURRENT}P
                    </PixelText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <PixelText variant="pixel" size={13} color={colors.goldDk}>
                    🪙{POINTS.toLocaleString()}
                  </PixelText>
                  <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: 3 }}>
                    포인트
                  </PixelText>
                </View>
              </View>
              <View
                style={{
                  height: 12,
                  backgroundColor: colors.pap3,
                  borderColor: colors.ink,
                  borderWidth: 2,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${Math.round((XP_CURRENT / XP_MAX) * 100)}%`,
                    height: '100%',
                    backgroundColor: colors.pur,
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
                <PixelText variant="pixel" size={9} color={colors.ink3}>
                  {XP_CURRENT} / {XP_MAX} XP
                </PixelText>
                <PixelText variant="pixel" size={9} color={colors.pur}>
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 14, marginBottom: 12 }}>
          <Block label="컬렉션 가치" value={`₩${fmt(totalVal)}`} sub={`▲ +${changePct}% 지난주`} color={colors.goldDk} icon="💰" />
          <Block label="그레이딩률" value={`${gradedPct}%`} sub={`${graded.length} / ${owned.length}장`} color={colors.pur} icon="🏆" />
          <Block label="최고가 카드" value={`₩${fmt(topCards[0] ? cardKrw(topCards[0], priceMode) : 0)}`} sub={topCards[0] ? displayCardName(topCards[0].name) : undefined} color={colors.grnDk} icon="🎯" />
          <Block label="이번주 거래" value={`${TRADES}건`} sub="+45P 포인트 획득" color={colors.blu} icon="🤝" onPress={() => router.push('/feed' as never)} />
        </View>

        {/* Section: 인기 카드들 (snkrdunk) */}
        {snkrRows.length > 0 && (
          <>
            <View style={{ marginHorizontal: 14 }}>
              <SectHd
                title="🔥 인기 카드들"
                more="전체보기 →"
                onMore={() => router.push('/cards/snkrdunk/all' as never)}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
              style={{ marginBottom: 12 }}
            >
              {snkrRows.map(({ seed, data }) => {
                const bg = seed.category ? SNKR_CAT_BG[seed.category] : colors.ink2;
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
                            backgroundColor: colors.pap2,
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
                            borderTopColor: colors.ink,
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
                                  borderColor: colors.ink,
                                  borderWidth: 1,
                                }}
                              >
                                <PixelText variant="pixel" size={8} color={colors.white}>
                                  {seed.category}
                                </PixelText>
                              </View>
                            ) : null}
                          </View>
                          <PixelText
                            variant="pixel"
                            size={9}
                            numberOfLines={1}
                            style={{ marginBottom: 4 }}
                          >
                            {seed.shortName}
                          </PixelText>
                          <PixelText variant="pixel" size={10} color={colors.red} numberOfLines={1}>
                            {priceText}
                          </PixelText>
                          <PixelText
                            variant="pixel"
                            size={8}
                            color={colors.ink3}
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
        )}

        {/* Section: 팩별 힛카드 */}
        {packs.length > 0 ? (
          <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
            <SectHd title={`📦 팩별 힛카드 · ${packs.length}팩`} />
            <View style={{ gap: 14 }}>
              {packs.map((pack) => (
                <PackHitsRow key={pack.code} pack={pack} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Section: 희귀도 분포 */}
        <View style={{ marginHorizontal: 14 }}>
          <SectHd title="희귀도 분포" />
        </View>
        <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
          <PixelFrame bg={colors.white}>
            <View style={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 8,
                  paddingBottom: 6,
                  borderBottomWidth: 3,
                  borderBottomColor: colors.pap3,
                  marginBottom: 10,
                  overflow: 'hidden',
                }}
              >
                {rarDist.map(({ r, n }) => {
                  const h = Math.round((n / rarMax) * 50) + 8;
                  return (
                    <View
                      key={r}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <PixelText variant="pixel" size={9} style={{ marginBottom: 4 }}>
                        {n}
                      </PixelText>
                      <View
                        style={{
                          width: '100%',
                          height: 58,
                          justifyContent: 'flex-end',
                          marginBottom: 4,
                        }}
                      >
                        <View
                          style={{
                            width: '100%',
                            height: h,
                            backgroundColor: rarColor(r),
                            borderColor: colors.ink,
                            borderWidth: 2,
                          }}
                        />
                      </View>
                      <RarBadge rar={r} />
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <PixelText variant="pixel" size={9} color={colors.ink3} style={{ width: 56 }}>
                  그레이딩
                </PixelText>
                <View
                  style={{
                    flex: 1,
                    height: 16,
                    backgroundColor: colors.pap3,
                    borderColor: colors.ink,
                    borderWidth: 2,
                    position: 'relative',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${gradedPct}%`,
                      backgroundColor: colors.gold,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      inset: 0 as never,
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PixelText variant="pixel" size={9}>
                      {gradedPct}%
                    </PixelText>
                  </View>
                </View>
                <PixelText variant="pixel" size={10} color={colors.goldDk} style={{ width: 40, textAlign: 'right' }}>
                  {graded.length}건
                </PixelText>
              </View>
            </View>
          </PixelFrame>
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
            const bg = on ? colors.ink : g !== '전체' ? gameColors[g as Game] : colors.white;
            const fg = on ? colors.gold : g !== '전체' ? colors.white : colors.ink;
            return (
              <Chip key={g} on={on} onPress={() => setActiveGame(g)} bg={bg} fg={fg} size={9} px={11} py={6}>
                {g === '전체' ? 'ALL' : g}
              </Chip>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 14, marginBottom: 12 }}>
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
                    <PixelText variant="pixel" size={11} style={{ flex: 1 }}>
                      {g}
                    </PixelText>
                    <PixelText variant="pixel" size={11} color={colors.ink3}>
                      {pct}%
                    </PixelText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
                    <PixelText variant="pixel" size={20} style={{ letterSpacing: -1 }}>
                      {n}
                    </PixelText>
                    <PixelText variant="pixel" size={11} color={colors.ink3} style={{ marginLeft: 4 }}>
                      장
                    </PixelText>
                  </View>
                  <PixelText variant="pixel" size={11} color={colors.grnDk} style={{ marginBottom: 8 }}>
                    ₩{fmt(val)}
                  </PixelText>
                  <View style={{ flexDirection: 'row', height: 8 }}>
                    {RARS.map((r) => {
                      const rn = owned.filter((c) => c.game === g && c.rar === r).length;
                      if (!rn) return null;
                      return <View key={r} style={{ flex: rn, backgroundColor: rarColor(r) }} />;
                    })}
                  </View>
                  {gGraded > 0 ? (
                    <PixelText variant="pixel" size={9} color={colors.goldDk} style={{ marginTop: 6 }}>
                      🏆 그레이딩 {gGraded}건
                    </PixelText>
                  ) : null}
                </View>
                </PixelFrame>
              </View>
            );
          })}
        </View>

        {/* Section: TOP 3 — always 3 fixed-size slots so 1-card collections
            still get a podium look. Empty slots render as a placeholder so
            container width + height stay uniform across the row. */}
        <View style={{ marginHorizontal: 14 }}>
          <SectHd title="TOP 3 고가 카드" more="전체 ▶" onMore={() => router.push('/my/cards' as never)} />
        </View>
        <View style={{ flexDirection: 'row', marginHorizontal: 14, gap: 8, marginBottom: 12 }}>
          {[0, 1, 2].map((i) => {
            const card = topCards[i];
            const podium = i === 0 ? colors.gold : i === 1 ? '#C0C0C0' : '#CD7F32';
            if (!card) {
              return (
                <View key={`empty-${i}`} style={{ flex: 1 }}>
                  <PixelFrame borderWidth={3} hi={null} lo={null}>
                    <View style={{ height: 196, borderTopWidth: 4, borderTopColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                      <PixelText variant="pixel" size={20} color={colors.pap3}>
                        #{i + 1}
                      </PixelText>
                      <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: 10, textAlign: 'center' }}>
                        비어있음
                      </PixelText>
                    </View>
                  </PixelFrame>
                </View>
              );
            }
            return (
              <View key={card.id} style={{ flex: 1 }}>
                <PixelPress
                  onPress={() => router.push(`/cards/${card.id}` as never)}
                  innerStyle={{ borderTopWidth: 4, borderTopColor: podium, height: 196 }}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        height: 130,
                        backgroundColor: gameColors[card.game] + '88',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {card.imageUrl ? (
                        <Image
                          source={{ uri: card.imageUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 36 }}>{card.emoji}</Text>
                      )}
                      <View
                        style={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          backgroundColor: podium,
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                          borderColor: colors.ink,
                          borderWidth: 1,
                        }}
                      >
                        <PixelText variant="pixel" size={10} color={colors.ink}>
                          #{i + 1}
                        </PixelText>
                      </View>
                      {card.grade ? (
                        <View style={{ position: 'absolute', bottom: 6, right: 6 }}>
                          <GradeBadge g={card.grade} size={24} />
                        </View>
                      ) : null}
                    </View>
                    <View style={{ padding: 8, borderTopColor: colors.ink, borderTopWidth: 3, flex: 1 }}>
                      <PixelText variant="pixel" size={9} numberOfLines={1} style={{ marginBottom: 5 }}>
                        {displayCardName(card.name)}
                      </PixelText>
                      <PixelText variant="pixel" size={10} color={colors.grnDk} numberOfLines={1}>
                        {priceLabel(cardPrice(card, priceMode), inferCardCurrency(card))}
                      </PixelText>
                    </View>
                  </View>
                </PixelPress>
              </View>
            );
          })}
        </View>

        {/* Section: 최근 활동 */}
        <View style={{ marginHorizontal: 14 }}>
          <SectHd title="최근 활동" />
        </View>
        <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
          <PixelFrame bg={colors.white}>
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
                    borderBottomColor: colors.pap3,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: a.c,
                      borderColor: colors.ink,
                      borderWidth: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{a.icon}</Text>
                  </View>
                  <PixelText variant="pixel" size={10} style={{ flex: 1, lineHeight: 15 }}>
                    {a.txt}
                  </PixelText>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <PixelText variant="pixel" size={10} color={colors.goldDk}>
                      {a.pt}
                    </PixelText>
                    <PixelText variant="pixel" size={9} color={colors.ink3}>
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
      <PixelText variant="pixel" size={9} color={colors.ink3} numberOfLines={1}>
        {label}
      </PixelText>
      <PixelText
        variant="pixel"
        size={18}
        color={color ?? colors.ink}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ letterSpacing: -1, marginVertical: 5 }}
      >
        {value}
      </PixelText>
      {sub ? (
        <PixelText variant="pixel" size={9} color={colors.ink3} numberOfLines={1}>
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

function QuickBtn({ icon, label, bg, href }: { icon: string; label: string; bg: string; href: string }) {
  return (
    <View style={{ flex: 1 }}>
      <PixelPress onPress={() => router.push(href as never)}>
        <View style={{ paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', gap: 7 }}>
          <View
            style={{
              width: 42,
              height: 42,
              backgroundColor: bg,
              borderColor: colors.ink,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
          <PixelText variant="pixel" size={10} numberOfLines={1}>
            {label}
          </PixelText>
        </View>
      </PixelPress>
    </View>
  );
}

function PackHitsRow({ pack }: { pack: PackWithHits }) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: pack.bg,
          borderColor: colors.ink,
          borderWidth: 3,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 18 }}>{pack.emoji}</Text>
        <PixelText variant="pixel" size={11} color={colors.white} style={{ flex: 1, letterSpacing: 0.5 }} numberOfLines={1}>
          {pack.shortName}
        </PixelText>
        {pack.releasedAt ? (
          <PixelText variant="pixel" size={8} color={colors.white} style={{ opacity: 0.85 }}>
            {pack.releasedAt.slice(0, 7).replace('-', '.')}
          </PixelText>
        ) : null}
        <Pressable onPress={() => router.push(`/cards/packs/${pack.code}` as never)}>
          <PixelText variant="pixel" size={8} color={colors.white} style={{ textDecorationLine: 'underline' }}>
            전체 ▶
          </PixelText>
        </Pressable>
      </View>
      {pack.hits.length === 0 ? (
        <View style={{ paddingVertical: 18, backgroundColor: colors.white, borderColor: colors.ink, borderWidth: 3, alignItems: 'center' }}>
          <PixelText variant="pixel" size={9} color={colors.ink3}>매물 확인 중…</PixelText>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {pack.hits.map((hit) => (
            <View key={hit.apparelId} style={{ width: 124 }}>
              <PixelPress
                onPress={() => router.push(`/cards/snkrdunk/${hit.apparelId}` as never)}
                innerStyle={{ borderTopWidth: 4, borderTopColor: pack.bg, height: 196 }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      height: 92,
                      backgroundColor: colors.pap2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {hit.imageUrl ? (
                      <Image source={{ uri: hit.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 28 }}>🃏</Text>
                    )}
                  </View>
                  <View style={{ padding: 8, borderTopColor: colors.ink, borderTopWidth: 3, flex: 1 }}>
                    <PixelText variant="pixel" size={9} numberOfLines={1} style={{ marginBottom: 6 }}>
                      {hit.shortName}
                    </PixelText>
                    <PixelText variant="pixel" size={10} color={colors.red} numberOfLines={1}>
                      {hit.minPrice > 0 ? `¥${hit.minPrice.toLocaleString('ja-JP')}` : '—'}
                    </PixelText>
                    <PixelText variant="pixel" size={8} color={colors.ink3} numberOfLines={1} style={{ marginTop: 'auto' }}>
                      {hit.listingCountText ? `매물 ${hit.listingCountText}건` : ' '}
                    </PixelText>
                  </View>
                </View>
              </PixelPress>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
