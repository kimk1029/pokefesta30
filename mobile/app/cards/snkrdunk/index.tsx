/**
 * /cards/snkrdunk — 스니덩크 시세 랜딩. 웹 src/app/cards/snkrdunk/page.tsx 패리티:
 * 히어로 배너(상품/매물 요약) + 검색바 + 추천 6종(browse 상단 6장 · 스파크라인 ·
 * 카테고리 칩 · 최저가) + 전체 보기(/cards/snkrdunk/all) 링크.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { LoadingState } from '@/components/cv/ListState';
import { ThumbImage } from '@/components/cv/ThumbImage';
import { fonts, space } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import {
  downsamplePricePoints,
  fetchSnkrdunkApparel,
  fetchSnkrdunkBrowse,
  fetchSnkrdunkSalesChart,
  SNKRDUNK_FEATURED_CARDS,
  type SnkrdunkApparel,
  type SnkrdunkSalesChart,
  type SnkrdunkSearchResult,
} from '@/services/snkrdunk';
import { jaToKoBatch, jaToKoCached } from '@/lib/cardLang';

type Category = 'SAR' | '프로모' | 'SR' | '원피스';

interface DisplaySeed {
  apparelId: number;
  shortName: string;
  localizedName?: string;
  category: Category | null;
}

interface CardRow {
  seed: DisplaySeed;
  apparel: SnkrdunkApparel | null;
  chart: SnkrdunkSalesChart | null;
}

const FEATURED_BY_ID = new Map(SNKRDUNK_FEATURED_CARDS.map((s) => [s.apparelId, s]));

function fmtYen(n: number): string {
  if (!n) return '—';
  return `¥${n.toLocaleString('ja-JP')}`;
}

/** 웹 inferCategory 동일. */
function inferCategory(name: string): Category | null {
  if (/プロモ|PROMO/i.test(name)) return '프로모';
  if (/\bSAR\b/.test(name)) return 'SAR';
  if (/\bSR\b/.test(name)) return 'SR';
  return null;
}

/** 웹 shortenName 동일. */
function shortenName(name: string): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > 28 ? cut.slice(0, 27) + '…' : cut;
}

function searchToSeed(r: SnkrdunkSearchResult): DisplaySeed {
  const jp = shortenName(r.name);
  const curated = FEATURED_BY_ID.get(r.apparelId);
  if (curated) {
    return { apparelId: r.apparelId, shortName: curated.shortName, localizedName: jp, category: curated.category };
  }
  return {
    apparelId: r.apparelId,
    shortName: shortenName(jaToKoCached(r.name)),
    localizedName: jp,
    category: inferCategory(r.name),
  };
}

export default function SnkrdunkLanding() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const [rows, setRows] = useState<CardRow[] | null>(null);
  const [q, setQ] = useState('');

  const CATEGORY_BG: Record<Category, string> = useMemo(
    () => ({ SAR: '#E8842C', 프로모: tc.pur, SR: tc.red, 원피스: tc.grnDk }),
    [tc],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      // 추천 6장은 전체보기 리스트 상단 6장과 동일 — browse 순서 그대로 (웹 동일).
      let seeds: DisplaySeed[];
      try {
        const pool = await fetchSnkrdunkBrowse(1);
        // 일→한 표시명 — 서버 공통 엔진 배치 선번역(캐시).
        await jaToKoBatch(pool.slice(0, 6).map((r) => r.name)).catch(() => undefined);
        seeds =
          pool.length > 0
            ? pool.slice(0, 6).map(searchToSeed)
            : SNKRDUNK_FEATURED_CARDS.slice(0, 6).map((s) => ({ apparelId: s.apparelId, shortName: s.shortName, category: s.category }));
      } catch {
        seeds = SNKRDUNK_FEATURED_CARDS.slice(0, 6).map((s) => ({ apparelId: s.apparelId, shortName: s.shortName, category: s.category }));
      }
      const loaded = await Promise.all(
        seeds.map(async (seed) => {
          const [apparel, chart] = await Promise.all([
            fetchSnkrdunkApparel(seed.apparelId).catch(() => null),
            fetchSnkrdunkSalesChart(seed.apparelId).catch(() => null),
          ]);
          return { seed, apparel, chart };
        }),
      );
      if (alive) setRows(loaded);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const okCount = (rows ?? []).filter((r) => r.apparel).length;
  const totalListings = (rows ?? []).reduce((s, r) => s + (r.apparel?.listingCount ?? 0), 0);

  const goSearch = () => {
    const t = q.trim();
    if (!t) return;
    router.push(`/cards/snkrdunk/search?q=${encodeURIComponent(t)}` as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tc.paper }}>
      <AppBar onBack={() => router.back()} title="스니덩크 시세" />
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* 히어로 배너 — 웹 동일 요약 */}
        <View style={{ marginHorizontal: space.gap, marginBottom: 12 }}>
          <PixelFrame bg={tc.ink} borderWidth={4} shadow={6} hi={tc.ink2} lo="rgba(0,0,0,0.5)" inner={3}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
              <Text style={{ fontSize: 30 }}>🇯🇵</Text>
              <View style={{ flex: 1 }}>
                <PixelText variant={txt} size={12} color={tc.yel} style={{ letterSpacing: 1 }}>
                  SNKRDUNK 일본 시세
                </PixelText>
                <PixelText variant={txt} size={9} color="rgba(255,255,255,0.7)" style={{ marginTop: 6, lineHeight: 14, letterSpacing: 0.3 }}>
                  상품 {okCount}/{rows?.length ?? 6}종 · 매물 총 {totalListings.toLocaleString()}건{'\n'}v1 API 기준 · 10분 캐시 · JPY
                </PixelText>
              </View>
            </View>
          </PixelFrame>
        </View>

        {/* 검색바 */}
        <View style={{ marginHorizontal: space.gap, marginBottom: 14 }}>
          <PixelFrame bg={tc.white} shadow={5} inner={3}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
              <PixelText variant={txt} size={13}>🔍</PixelText>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="카드 검색 (예: 리자몽)"
                placeholderTextColor={tc.ink3}
                style={{ flex: 1, fontFamily: fonts.ko, fontSize: 14, color: tc.ink, paddingVertical: 11 }}
                onSubmitEditing={goSearch}
                returnKeyType="search"
              />
              <Pressable onPress={goSearch} hitSlop={8}>
                <PixelText variant={txt} size={12} color={tc.blu}>▶</PixelText>
              </Pressable>
            </View>
          </PixelFrame>
        </View>

        {/* 추천 6종 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: space.gap, marginBottom: 10 }}>
          <PixelText variant="ko" size={14} weight="bold" color={tc.ink}>추천 6종</PixelText>
          <Pressable onPress={() => router.push('/cards/snkrdunk/all' as never)} hitSlop={6}>
            <PixelText variant={txt} size={10} color={tc.blu}>전체 보기 ▶</PixelText>
          </Pressable>
        </View>

        {rows === null ? (
          <View style={{ paddingTop: 20 }}><LoadingState /></View>
        ) : (
          <View style={{ marginHorizontal: space.gap, gap: 8 }}>
            {rows.map(({ seed, apparel, chart }) => {
              const pts = downsamplePricePoints([...(chart?.points ?? [])].sort((a, b) => a[0] - b[0]));
              return (
                <PixelPress
                  key={seed.apparelId}
                  onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}
                  bg={tc.white}
                  borderWidth={3}
                  shadow={5}
                  inner={3}
                >
                  <View style={{ flexDirection: 'row', gap: 12, padding: 12, alignItems: 'center' }}>
                    <ThumbImage uri={apparel?.imageUrl} style={{ width: 56, height: 78 }} borderColor={tc.ink} emojiSize={22} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {seed.category ? (
                        <View style={{ alignSelf: 'flex-start', backgroundColor: CATEGORY_BG[seed.category], paddingHorizontal: 6, paddingVertical: 2 }}>
                          <PixelText variant={txt} size={7} color={tc.white}>{seed.category}</PixelText>
                        </View>
                      ) : null}
                      <PixelText variant="ko" size={12} weight="bold" color={tc.ink} numberOfLines={2} style={{ marginTop: 4, lineHeight: 17 }}>
                        {seed.shortName}
                      </PixelText>
                      {seed.localizedName && seed.localizedName !== seed.shortName ? (
                        <PixelText variant={txt} size={8} color={tc.ink3} numberOfLines={1} style={{ marginTop: 3 }}>
                          {seed.localizedName}
                        </PixelText>
                      ) : null}
                      <PixelText variant={txt} size={11} weight="bold" color={tc.red} style={{ marginTop: 5 }}>
                        {fmtYen(apparel?.minPrice ?? 0)}
                      </PixelText>
                    </View>
                    <Sparkline points={pts} tc={tc} txt={txt} />
                  </View>
                </PixelPress>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** 추천 카드 우측 미니 스파크라인 — 웹 landing Sparkline 동일. */
function Sparkline({ points, tc, txt }: { points: Array<[number, number]>; tc: ReturnType<typeof useThemeColors>; txt: 'pixel' | 'ko' }) {
  const width = 90;
  const height = 34;
  if (points.length < 2) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center', backgroundColor: tc.pap2 }}>
        <PixelText variant={txt} size={7} color={tc.ink3}>이력 부족</PixelText>
      </View>
    );
  }
  const ys = points.map((p) => p[1]);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const yOf = (v: number) => height - ((v - min) / range) * height;
  const d = ys.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const trendUp = ys[ys.length - 1] >= ys[0];
  const color = trendUp ? tc.red : tc.blu;
  return (
    <View style={{ backgroundColor: tc.pap2 }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={(points.length - 1) * stepX} cy={yOf(ys[ys.length - 1])} r={2.2} fill={color} />
      </Svg>
    </View>
  );
}
