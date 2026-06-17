import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, ScrollView, Pressable, Text, Image, Animated, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { HeroBanner, type HeroSlideData } from '@/components/HeroBanner';
import { useCurrency } from '@/components/CurrencyProvider';
import { useTheme, useThemeColors } from '@/components/ThemeProvider';
import { isFlatTheme } from '@/lib/theme';
import { fonts } from '@/theme/tokens';
import {
  fetchSnkrdunkApparel,
  fetchSnkrdunkApparelGroup,
  fetchSnkrdunkBrowse,
  fetchSnkrdunkSalesChart,
  SNKRDUNK_FEATURED_CARDS,
  type SnkrdunkApparel,
  type SnkrdunkCardSeed,
} from '@/services/snkrdunk';
import { CARD_PACKS } from '@/data/cardPacks';
import { localizeCardName } from '@/lib/cardNameKo';
import { api } from '@/lib/apiClient';

/**
 * 메인화면 — Claude Design 'POKE30 App' 프로토타입 레이아웃 (네이티브).
 * 모든 테마가 같은 레이아웃을 쓰고 색/폰트만 테마별로 달라진다 — 클린은 프로토타입
 * 오렌지 팔레트 그대로, 그 외 테마는 테마 토큰(tc)/폰트. HOT·박스는 자동 슬라이딩하며,
 * 카드 아트는 컨테이너 없이 이미지만 떠 보인다.
 */

const ACCENT30 = '#FF7A00'; // POKE'30' 브랜드 액센트 — 모든 테마 공통
const RISE = '#F5333F';
const FALL = '#2C8FFF';

interface Palette {
  bg: string;
  ink: string;
  ink2: string;
  ink3: string;
  rise: string;
  fall: string;
  priceIcon: string;
  regIcon: string;
  searchBg: string;
  tileBg: string;
  line: string;
  chev: string;
}

const CLEAN_PALETTE: Palette = {
  bg: '#ffffff',
  ink: '#16161a',
  ink2: '#8E8E93',
  ink3: '#9A9AA0',
  rise: RISE,
  fall: FALL,
  priceIcon: ACCENT30,
  regIcon: '#5FB85A',
  searchBg: '#F2F2F4',
  tileBg: '#F7F7F9',
  line: '#F0F0F2',
  chev: '#C2C2C8',
};

/** 판매 차트 포인트에서 등락률(%) — 등급 스파이크(중앙값 2.5배 초과) 제외. */
function trendChangePct(points: Array<[number, number]>): number | undefined {
  const ys = (points ?? []).map((p) => p[1]).filter((n) => typeof n === 'number' && n > 0);
  if (ys.length < 2) return undefined;
  const sorted = [...ys].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const ceil = med > 0 ? med * 2.5 : Infinity;
  const clean = ys.filter((n) => n <= ceil);
  if (clean.length < 2 || clean[0] <= 0) return undefined;
  return ((clean[clean.length - 1] - clean[0]) / clean[0]) * 100;
}

function pctInfo(pct: number | undefined, P: Palette): { text: string; color: string } | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  const up = pct >= 0;
  return { text: `${up ? '+' : ''}${pct.toFixed(1)}% ${up ? '▲' : '▼'}`, color: up ? P.rise : P.fall };
}

const FALLBACK_BG = ['#f9d423', '#ff6a3d', '#f7a6c4', '#9d6bd6', '#3a3a44', '#7ad0c2'];

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

const BOX_NAME_RE = /ボックス|box|booster|ブースター|デッキビルド|スターター|拡張パック|ハイクラスパック|ポケモンセンターセット|シュリンク/i;
const isBoxName = (name: string) => BOX_NAME_RE.test(name || '');

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
function rankBadgeColor(rank: number): string {
  if (rank === 1) return RISE;
  if (rank === 3) return ACCENT30;
  return '#2B2B2B';
}

/** 카드 아트 — 컨테이너 없이 이미지만 떠 보이게(은은한 그림자). */
function CardArt({
  imageUrl,
  fallbackIdx,
  width,
  height,
  radius,
  children,
}: {
  imageUrl: string | null;
  fallbackIdx: number;
  width: number;
  height: number;
  radius: number;
  children?: ReactNode;
}) {
  // 컨테이너(박스) 없이 이미지 '자체'에 그림자를 준다 — iOS 는 이미지 콘텐츠(알파)에서,
  // Android 는 elevation 으로 그림자를 만든다. overflow:'hidden' 을 주지 않아야 그림자가 안 잘린다
  // (Image 는 borderRadius 를 자체적으로 클리핑).
  const shadow = {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  } as const;
  return (
    <View style={{ position: 'relative', width, height }}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width, height, borderRadius: radius, ...shadow }} resizeMode="cover" />
      ) : (
        <View style={{ width, height, borderRadius: radius, backgroundColor: FALLBACK_BG[fallbackIdx % FALLBACK_BG.length], alignItems: 'center', justifyContent: 'center', ...shadow }}>
          <Text style={{ fontSize: 40 }}>🃏</Text>
        </View>
      )}
      {children}
    </View>
  );
}

/** 가로 캐러셀 자동 슬라이딩 — 카드를 두 벌 이어붙여 등속 좌측 무한 루프. 손대면 멈췄다 이어감. */
function AutoCarousel<T>({
  data,
  itemWidth,
  gap,
  renderItem,
}: {
  data: T[];
  itemWidth: number;
  gap: number;
  renderItem: (item: T, indexInSet: number) => ReactNode;
}) {
  const tx = useRef(new Animated.Value(0)).current;
  const txVal = useRef(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const STEP = itemWidth + gap;
  const setWidth = data.length * STEP;

  useEffect(() => {
    const id = tx.addListener(({ value }) => {
      txVal.current = value;
    });
    return () => tx.removeListener(id);
  }, [tx]);

  const runMarquee = (fromTx: number) => {
    if (setWidth <= 0) return;
    let v = fromTx % setWidth;
    if (v > 0) v -= setWidth;
    const dist = setWidth + v;
    if (dist <= 0.5) {
      tx.setValue(0);
      runMarquee(0);
      return;
    }
    tx.setValue(v);
    animRef.current = Animated.timing(tx, {
      toValue: -setWidth,
      duration: (dist / 22) * 1000, // ~22px/s
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animRef.current.start(({ finished }) => {
      if (finished) runMarquee(0);
    });
  };

  useEffect(() => {
    runMarquee(0);
    return () => {
      animRef.current?.stop();
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setWidth]);

  const pause = () => {
    animRef.current?.stop();
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };
  const resumeSoon = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => runMarquee(txVal.current), 1600);
  };

  const display = [...data, ...data];
  return (
    <View style={{ overflow: 'hidden', paddingTop: 8, paddingBottom: 4 }} onTouchStart={pause} onTouchEnd={resumeSoon} onTouchCancel={resumeSoon}>
      <Animated.View style={{ flexDirection: 'row', paddingLeft: 20, transform: [{ translateX: tx }] }}>
        {display.map((item, i) => (
          <View key={i} style={{ width: itemWidth, marginRight: gap }}>
            {renderItem(item, i % data.length)}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function CleanHomeScreen() {
  const { format } = useCurrency();
  const { theme } = useTheme();
  const tc = useThemeColors();
  const flat = isFlatTheme(theme);
  const isClean = theme === 'clean';
  const P: Palette = isClean
    ? CLEAN_PALETTE
    : {
        bg: tc.paper,
        ink: tc.ink,
        ink2: tc.ink3,
        ink3: tc.ink3,
        rise: tc.red,
        fall: tc.blu,
        priceIcon: tc.gold,
        regIcon: tc.grn,
        searchBg: tc.pap2,
        tileBg: tc.pap2,
        line: tc.pap3,
        chev: tc.ink3,
      };

  // 테마별 폰트 — 플랫(clean·dark·yugioh·onepiece)=시스템 산세리프, 그 외(픽셀)=갈무리.
  const fontReg = flat ? undefined : fonts.ko;
  const fontBold = flat ? undefined : fonts.koBold;
  const ts = (size: number, weight: '400' | '600' | '700' | '800' | '900', color: string) => ({
    fontFamily: Number(weight) >= 700 ? fontBold : fontReg,
    fontSize: size,
    fontWeight: weight,
    color,
    lineHeight: Math.round(size * 1.3),
  });

  const fmtPrice = (jpy: number) => (jpy > 0 ? format(jpy) : '—');

  const [snkrRows, setSnkrRows] = useState<SnkrRow[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const pool = (await fetchSnkrdunkBrowse(1)).filter((r) => !isBoxName(r.name));
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
                      shortName: shortenSnkrName(localizeCardName(r.name)),
                      category: inferSnkrCategory(r.name),
                    };
              })
          : shuffle(SNKRDUNK_FEATURED_CARDS)
              .slice(0, 6)
              .map((s) => ({ apparelId: s.apparelId, shortName: s.shortName, category: s.category }));
      const rows = await Promise.all(
        seeds.map(async (seed) => ({ seed, data: await fetchSnkrdunkApparel(seed.apparelId) })),
      );
      if (alive) setSnkrRows(rows);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 등락률 — 표시된 인기 카드의 판매 차트를 받아 % 계산(렌더 후 점진 채움).
  const [changeById, setChangeById] = useState<Record<number, number>>({});
  useEffect(() => {
    if (snkrRows.length === 0) return;
    let alive = true;
    (async () => {
      await Promise.all(
        snkrRows.map(async ({ seed }) => {
          const chart = await fetchSnkrdunkSalesChart(seed.apparelId).catch(() => null);
          const pct = chart ? trendChangePct(chart.points) : undefined;
          if (alive && pct != null) setChangeById((prev) => ({ ...prev, [seed.apparelId]: pct }));
        }),
      );
    })();
    return () => {
      alive = false;
    };
  }, [snkrRows]);

  const [snkrBoxRows, setSnkrBoxRows] = useState<SnkrRow[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const pool = CARD_PACKS.filter((p) => (p.game ?? 'pokemon') === 'pokemon' && p.apparelGroupId > 0)
        .sort((a, b) => (b.releasedAt ?? '').localeCompare(a.releasedAt ?? ''))
        .slice(0, 12);
      const picked = shuffle(pool).slice(0, 8);
      const rows = await Promise.all(
        picked.map(async (pack): Promise<SnkrRow | null> => {
          const page = await fetchSnkrdunkApparelGroup(pack.apparelGroupId, {
            apparelCategoryId: 14,
            page: 1,
            perPage: 1,
          });
          const box = page?.apparels?.[0];
          if (!box || !box.id) return null;
          return { seed: { apparelId: box.id, shortName: pack.shortName, category: null }, data: box };
        }),
      );
      if (alive) setSnkrBoxRows(rows.filter((r): r is SnkrRow => r !== null).slice(0, 6));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const [banners, setBanners] = useState<HeroSlideData[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api<{ data: HeroSlideData[] }>('/api/banners', { auth: false });
        if (alive) setBanners(Array.isArray(r?.data) ? r.data : []);
      } catch {
        if (alive) setBanners([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const Chevron = ({ size, color, w }: { size: number; color: string; w: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m9 6 6 6-6 6" />
    </Svg>
  );

  const MoreLink = ({ onPress }: { onPress: () => void }) => (
    <Pressable onPress={onPress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={ts(13, '600', P.ink3)}>더보기</Text>
      <Chevron size={13} color={P.ink3} w={2.6} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 }}>
          <Text style={ts(24, '900', P.ink)}>
            <Text style={ts(24, '900', P.ink)}>POKE</Text>
            <Text style={ts(24, '900', ACCENT30)}>30</Text>
          </Text>
          <Pressable onPress={() => router.push('/messages' as never)} hitSlop={8}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </Svg>
          </Pressable>
        </View>

        {/* search */}
        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }}>
          <Pressable
            onPress={() => router.push('/cards/snkrdunk/search' as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.searchBg, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16 }}
          >
            <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={P.ink3} strokeWidth={2.2} strokeLinecap="round">
              <Circle cx={11} cy={11} r={7} />
              <Path d="m20 20-3.5-3.5" />
            </Svg>
            <Text style={[ts(14.5, '400', P.ink3), { flex: 1 }]}>카드명 또는 세트명으로 검색하세요</Text>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={P.ink3} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
            </Svg>
          </Pressable>
        </View>

        {/* promo banner — 비면 컴포넌트 내장 폴백 슬라이드 */}
        <HeroBanner slides={banners} />

        {/* quick scan */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
          <Text style={[ts(18, '800', P.ink), { marginBottom: 12 }]}>빠른 스캔</Text>
          <View style={{ flexDirection: 'row', gap: 11 }}>
            <Pressable
              onPress={() => router.push('/cards/packs' as never)}
              style={{ flex: 1, backgroundColor: P.tileBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={P.priceIcon} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <Circle cx={12} cy={12} r={3.2} />
                </Svg>
                <Chevron size={16} color={P.chev} w={2.4} />
              </View>
              <Text style={[ts(16, '800', P.ink), { marginTop: 14 }]}>시세 확인</Text>
              <Text style={[ts(12, '400', P.ink2), { marginTop: 3 }]}>카드 시세를 바로 확인해요</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/cards/add' as never)}
              style={{ flex: 1, backgroundColor: P.tileBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={P.regIcon} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <Path d="M12 11v6M9 14h6" />
                </Svg>
                <Chevron size={16} color={P.chev} w={2.4} />
              </View>
              <Text style={[ts(16, '800', P.ink), { marginTop: 14 }]}>내 카드 등록</Text>
              <Text style={[ts(12, '400', P.ink2), { marginTop: 3 }]}>보유 카드를 등록하고 관리해요</Text>
            </Pressable>
          </View>
        </View>

        {/* HOT cards — 자동 슬라이딩 */}
        {snkrRows.length > 0 ? (
          <View style={{ paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 13 }}>
              <Text style={ts(18, '800', P.ink)}>HOT 카드</Text>
              <MoreLink onPress={() => router.push('/cards/snkrdunk' as never)} />
            </View>
            <AutoCarousel
              data={snkrRows}
              itemWidth={100}
              gap={14}
              renderItem={({ seed, data }, idx) => (
                <Pressable onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}>
                  <CardArt imageUrl={data?.imageUrl ?? null} fallbackIdx={idx} width={100} height={138} radius={11}>
                    <View
                      style={{
                        position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 11,
                        backgroundColor: rankBadgeColor(idx + 1), alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{idx + 1}</Text>
                    </View>
                  </CardArt>
                  <Text numberOfLines={1} style={[ts(12.5, '700', P.ink), { marginTop: 9 }]}>{seed.shortName}</Text>
                  <Text numberOfLines={1} style={[ts(15, '900', P.ink), { marginTop: 4, letterSpacing: -0.3 }]}>{fmtPrice(data?.minPrice ?? 0)}</Text>
                  {(() => {
                    const pc = pctInfo(changeById[seed.apparelId], P);
                    return pc ? <Text numberOfLines={1} style={[ts(12, '800', pc.color), { marginTop: 2 }]}>{pc.text}</Text> : null;
                  })()}
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {/* box hot cards — 자동 슬라이딩 */}
        {snkrBoxRows.length > 0 ? (
          <View style={{ paddingBottom: 26 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 13 }}>
              <Text style={ts(18, '800', P.ink)}>박스 힛카드</Text>
              <MoreLink onPress={() => router.push('/cards/packs' as never)} />
            </View>
            <AutoCarousel
              data={snkrBoxRows}
              itemWidth={100}
              gap={14}
              renderItem={({ seed, data }, idx) => (
                <Pressable onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}>
                  <CardArt imageUrl={data?.imageUrl ?? null} fallbackIdx={idx} width={100} height={100} radius={13} />
                  <Text numberOfLines={1} style={[ts(12.5, '700', P.ink), { marginTop: 9 }]}>{seed.shortName}</Text>
                  <Text style={[ts(11, '400', P.ink2), { marginTop: 3 }]}>
                    평균 시세 <Text style={ts(11, '800', P.rise)}>{fmtPrice(data?.minPrice ?? 0)}</Text>
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {/* realtime movers */}
        {snkrRows.length > 0 ? (
          <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={P.rise} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="m3 17 6-6 4 4 8-8" />
                  <Path d="M17 7h4v4" />
                </Svg>
                <Text style={ts(18, '800', P.ink)}>실시간 급등 카드</Text>
              </View>
              <MoreLink onPress={() => router.push('/cards/snkrdunk' as never)} />
            </View>
            {[...snkrRows]
              .sort((a, b) => (changeById[b.seed.apparelId] ?? -Infinity) - (changeById[a.seed.apparelId] ?? -Infinity))
              .map(({ seed, data }, i) => {
                const pc = pctInfo(changeById[seed.apparelId], P);
                return (
                  <Pressable
                    key={seed.apparelId}
                    onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: P.line }}
                  >
                    <Text style={[ts(15, '800', i < 3 ? P.rise : P.ink), { width: 14, textAlign: 'center' }]}>{i + 1}</Text>
                    <CardArt imageUrl={data?.imageUrl ?? null} fallbackIdx={i} width={46} height={46} radius={9} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={ts(14, '700', P.ink)}>{seed.shortName}</Text>
                      <Text numberOfLines={1} style={[ts(12, '400', P.ink3), { marginTop: 2 }]}>{seed.category ?? '카드'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={ts(14.5, '900', P.ink)}>{fmtPrice(data?.minPrice ?? 0)}</Text>
                      {pc ? <Text style={[ts(12.5, '800', pc.color), { marginTop: 3 }]}>{pc.text}</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
