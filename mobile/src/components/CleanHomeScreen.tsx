import { useEffect, useState, type ReactNode } from 'react';
import { View, ScrollView, Pressable, Text, Image } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { HeroBanner, type HeroSlideData } from '@/components/HeroBanner';
import { useCurrency } from '@/components/CurrencyProvider';
import {
  fetchSnkrdunkApparel,
  fetchSnkrdunkApparelGroup,
  fetchSnkrdunkBrowse,
  SNKRDUNK_FEATURED_CARDS,
  type SnkrdunkApparel,
  type SnkrdunkCardSeed,
} from '@/services/snkrdunk';
import { CARD_PACKS } from '@/data/cardPacks';
import { localizeCardName } from '@/lib/cardNameKo';
import { api } from '@/lib/apiClient';

/**
 * 클린 스타일 메인화면 — Claude Design 'POKE30 App' 프로토타입 정밀 복제 (네이티브).
 * 웹 src/components/dashboard/CleanHome.tsx 와 1:1 대응. 프로토타입 고유 팔레트
 * (오렌지 #FF7A00)를 그대로 쓰며, 카드 아트는 실제 snkrdunk 이미지로 채운다.
 */

// 프로토타입 팔레트
const C = {
  ink: '#16161a',
  ink2: '#8E8E93',
  ink3: '#9A9AA0',
  accent: '#FF7A00',
  green: '#5FB85A',
  rise: '#F5333F',
  searchBg: '#F2F2F4',
  tileBg: '#F7F7F9',
  line: '#F0F0F2',
  chev: '#C2C2C8',
};

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

// 박스 판별 — 웹 DashboardScreen BOX_NAME_RE 와 마커 일치.
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
  if (rank === 1) return C.rise;
  if (rank === 3) return C.accent;
  return '#2B2B2B';
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.16,
  shadowRadius: 7,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

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
  return (
    <View
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: imageUrl ? '#fff' : FALLBACK_BG[fallbackIdx % FALLBACK_BG.length],
        alignItems: 'center',
        justifyContent: 'center',
        ...cardShadow,
      }}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Text style={{ fontSize: 40 }}>🃏</Text>
      )}
      {children}
    </View>
  );
}

function SectionHead({ title, onMore }: { title: ReactNode; onMore: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 13,
      }}
    >
      {typeof title === 'string' ? (
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{title}</Text>
      ) : (
        title
      )}
      <Pressable onPress={onMore} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink3 }}>더보기</Text>
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m9 6 6 6-6 6" />
        </Svg>
      </Pressable>
    </View>
  );
}

function QuickTile({
  label,
  desc,
  icon,
  onPress,
}: {
  label: string;
  desc: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, backgroundColor: C.tileBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {icon}
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.chev} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m9 6 6 6-6 6" />
        </Svg>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 14 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>{desc}</Text>
    </Pressable>
  );
}

export function CleanHomeScreen() {
  const { format } = useCurrency();
  const fmtPrice = (jpy: number) => (jpy > 0 ? format(jpy) : '—');

  const [snkrRows, setSnkrRows] = useState<SnkrRow[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      // 인기 카드(싱글만) — 박스류 제외.
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

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 8,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>
            <Text style={{ color: C.ink }}>POKE</Text>
            <Text style={{ color: C.accent }}>30</Text>
          </Text>
          <Pressable onPress={() => router.push('/messages' as never)} hitSlop={8}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </Svg>
          </Pressable>
        </View>

        {/* search */}
        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }}>
          <Pressable
            onPress={() => router.push('/cards/snkrdunk/search' as never)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: C.searchBg,
              borderRadius: 14,
              paddingVertical: 13,
              paddingHorizontal: 16,
            }}
          >
            <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth={2.2} strokeLinecap="round">
              <Circle cx={11} cy={11} r={7} />
              <Path d="m20 20-3.5-3.5" />
            </Svg>
            <Text style={{ flex: 1, fontSize: 14.5, color: C.ink3 }}>카드명 또는 세트명으로 검색하세요</Text>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
            </Svg>
          </Pressable>
        </View>

        {/* promo banner — 비면 컴포넌트 내장 폴백 슬라이드 */}
        <HeroBanner slides={banners} />

        {/* quick scan */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 12 }}>빠른 스캔</Text>
          <View style={{ flexDirection: 'row', gap: 11 }}>
            <QuickTile
              label="시세 확인"
              desc="카드 시세를 바로 확인해요"
              onPress={() => router.push('/cards/packs' as never)}
              icon={
                <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <Circle cx={12} cy={12} r={3.2} />
                </Svg>
              }
            />
            <QuickTile
              label="내 카드 등록"
              desc="보유 카드를 등록하고 관리해요"
              onPress={() => router.push('/cards/add' as never)}
              icon={
                <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <Path d="M12 11v6M9 14h6" />
                </Svg>
              }
            />
          </View>
        </View>

        {/* HOT cards */}
        {snkrRows.length > 0 ? (
          <View style={{ paddingBottom: 24 }}>
            <SectionHead title="HOT 카드" onMore={() => router.push('/cards/snkrdunk' as never)} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            >
              {snkrRows.map(({ seed, data }, i) => (
                <Pressable
                  key={seed.apparelId}
                  onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}
                  style={{ width: 100 }}
                >
                  <CardArt imageUrl={data?.imageUrl ?? null} fallbackIdx={i} width={100} height={138} radius={11}>
                    <View
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: rankBadgeColor(i + 1),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{i + 1}</Text>
                    </View>
                  </CardArt>
                  <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: C.ink, marginTop: 9 }}>
                    {seed.shortName}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink, marginTop: 3 }}>
                    {fmtPrice(data?.minPrice ?? 0)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* box hot cards */}
        {snkrBoxRows.length > 0 ? (
          <View style={{ paddingBottom: 26 }}>
            <SectionHead title="박스 힛카드" onMore={() => router.push('/cards/packs' as never)} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            >
              {snkrBoxRows.map(({ seed, data }, i) => (
                <Pressable
                  key={seed.apparelId}
                  onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}
                  style={{ width: 100 }}
                >
                  <CardArt imageUrl={data?.imageUrl ?? null} fallbackIdx={i} width={100} height={100} radius={13} />
                  <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: C.ink, marginTop: 9 }}>
                    {seed.shortName}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.ink2, marginTop: 3 }}>
                    평균 시세 <Text style={{ color: C.rise, fontWeight: '800' }}>{fmtPrice(data?.minPrice ?? 0)}</Text>
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* realtime movers */}
        {snkrRows.length > 0 ? (
          <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.rise} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="m3 17 6-6 4 4 8-8" />
                  <Path d="M17 7h4v4" />
                </Svg>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>실시간 급등 카드</Text>
              </View>
              <Pressable onPress={() => router.push('/cards/snkrdunk' as never)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink3 }}>더보기</Text>
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="m9 6 6 6-6 6" />
                </Svg>
              </Pressable>
            </View>
            {snkrRows.map(({ seed, data }, i) => (
              <Pressable
                key={seed.apparelId}
                onPress={() => router.push(`/cards/snkrdunk/${seed.apparelId}` as never)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 13,
                  borderBottomWidth: 1,
                  borderBottomColor: C.line,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink, width: 14, textAlign: 'center' }}>{i + 1}</Text>
                <CardArt imageUrl={data?.imageUrl ?? null} fallbackIdx={i} width={46} height={46} radius={9} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>
                    {seed.shortName}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
                    {seed.category ?? '카드'}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>{fmtPrice(data?.minPrice ?? 0)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
