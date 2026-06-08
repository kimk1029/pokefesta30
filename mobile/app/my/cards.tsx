/**
 * /my/cards — 내 카드 컬렉션.
 *
 * 웹 MyCardsScreen 과 동일한 4 view (그리드/리스트/앨범/필름) + 등급 탭 + 정렬.
 * 서버에서 /api/me/cards/with-prices 로 enriched MyCardRow 가져와 표시.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type View as RNView,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { AppBar } from '@/components/AppBar';
import { PortfolioHero } from '@/components/PortfolioHero';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { EmptyState, ErrorView, LoadingState } from '@/components/cv/ListState';
import { InlineLoginGate } from '@/components/InlineLoginGate';
import { useCurrency } from '@/components/CurrencyProvider';
import { useToast } from '@/components/ToastProvider';
import { usePriceMode } from '@/lib/priceMode';
import { colors, fonts, space } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import {
  fetchMyCards,
  deleteMyCard,
  type MyCardRow,
} from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';
import { isAuthenticated, subscribeSession } from '@/lib/session';
import {
  detectRarity,
  RARITY_ORDER,
  RARITY_BG,
  RARITY_FG,
  type Rarity,
} from '@/lib/cardRarity';
import { localizeCardName } from '@/lib/cardNameKo';
import {
  CardSpotlightModal,
  type CardSpotlightData,
  type SpotlightOrigin,
} from '@/components/CardSpotlightModal';
import { autoPriceSize } from '../../../shared/util/autoPriceSize';

type ViewMode = 'grid' | 'list' | 'album' | 'film';
type SortBy = 'recent' | 'name' | 'price' | 'grade';
type RarFilter = 'all' | Rarity;

const VIEW_TABS: Array<[ViewMode, string]> = [
  ['grid', '바둑판'],
  ['list', '리스트'],
  ['album', '앨범'],
  ['film', '필름'],
];
const SORT_TABS: Array<[SortBy, string]> = [
  ['recent', '최근'],
  ['name', '이름'],
  ['price', '가격'],
  ['grade', '등급'],
];

interface Display {
  src: MyCardRow;
  name: string;
  imageUrl: string | null;
  rar: Rarity;
  gradeNum: number | null;
  priceJpy: number;
}

function toDisplay(c: MyCardRow, mode: 'single' | 'psa10'): Display {
  const raw =
    c.nickname ||
    c.snkrdunkName ||
    c.cardId ||
    (c.ocrSetCode || c.ocrCardNumber
      ? `${c.ocrSetCode ?? '?'} ${c.ocrCardNumber ?? ''}`.trim()
      : '미식별 카드');
  const psa10 = c.pricePsa10Jpy ?? 0;
  const single = c.priceSingleJpy ?? c.snkrdunkMinPriceJpy ?? 0;
  return {
    src: c,
    name: localizeCardName(raw),
    imageUrl: c.photoUrl || c.snkrdunkImageUrl || null,
    rar: detectRarity(c.nickname, c.snkrdunkName, c.cardId),
    gradeNum: parsePsa(c.gradeEstimate),
    priceJpy: mode === 'psa10' && psa10 > 0 ? psa10 : single,
  };
}

function parsePsa(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/PSA\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

/* ── 등락률(change rate) — 웹 MyCardsScreen 과 동일 로직 ── */
type Dir = 'up' | 'down' | 'flat';
function changeFromTrend(trend: number[] | undefined): { pct: number; dir: Dir } | null {
  if (!Array.isArray(trend) || trend.length < 2) return null;
  const prev = trend[trend.length - 2];
  const last = trend[trend.length - 1];
  if (!(prev > 0)) return null;
  const pct = ((last - prev) / prev) * 100;
  const dir: Dir = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, dir };
}
// 한국 관습: 상승=빨강, 하락=파랑.
const CHANGE_COLOR: Record<Dir, string> = { up: colors.red, down: colors.blu, flat: colors.ink3 };
const CHANGE_ARROW: Record<Dir, string> = { up: '▲', down: '▼', flat: '–' };

function useAuthed(): boolean {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  useEffect(() => subscribeSession(() => setAuthed(isAuthenticated())), []);
  return authed;
}

export default function MyCardsScreen() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const authed = useAuthed();
  const { format } = useCurrency();
  const { mode: priceMode } = usePriceMode();
  const toast = useToast();

  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [rar, setRar] = useState<RarFilter>('all');
  const [sort, setSort] = useState<SortBy>('recent');

  const { data, loading, error, refresh } = useAsync<MyCardRow[]>(fetchMyCards, [authed]);

  if (!authed) {
    return (
      <InlineLoginGate
        title="내 컬렉션"
        feature="내 컬렉션"
        description="스캔·구매·거래한 카드와 시세를 한곳에서 관리하세요."
        icon="📦"
      />
    );
  }

  const display: Display[] = (data ?? []).map((c) => toDisplay(c, priceMode));

  const presentRarities = useMemo(() => {
    const set = new Set<Rarity>();
    for (const d of display) set.add(d.rar);
    return RARITY_ORDER.filter((r) => set.has(r));
  }, [display]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let out = display.filter((d) => {
      if (rar !== 'all' && d.rar !== rar) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q);
    });
    if (sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'price') out = [...out].sort((a, b) => b.priceJpy - a.priceJpy);
    if (sort === 'grade') out = [...out].sort((a, b) => (b.gradeNum ?? 0) - (a.gradeNum ?? 0));
    return out;
  }, [display, search, rar, sort]);

  const totalJpy = filtered.reduce((s, d) => s + d.priceJpy, 0);
  const gradedN = filtered.filter((d) => d.gradeNum !== null).length;

  const onDelete = (id: number) => {
    Alert.alert('카드 삭제', '이 카드를 컬렉션에서 제거할까요?', [
      { text: '취소' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMyCard(id);
            toast.success('카드가 삭제되었습니다');
            refresh();
          } catch {
            toast.error('삭제 실패');
          }
        },
      },
    ]);
  };

  const openDetail = (d: Display) => {
    if (d.src.snkrdunkApparelId) {
      router.push(`/cards/snkrdunk/${d.src.snkrdunkApparelId}` as never);
    }
  };

  // 🔍 카드 스포트라이트 — 컬렉션 카드 우상단 버튼을 누르면 풀스크린 회전 확대.
  const [spotlight, setSpotlight] = useState<{ data: CardSpotlightData; origin: SpotlightOrigin | null } | null>(null);

  const openSpotlight = useCallback(
    (d: Display, origin: SpotlightOrigin | null) => {
      const subtitleParts: string[] = [];
      if (d.src.ocrSetCode) subtitleParts.push(d.src.ocrSetCode);
      if (d.src.ocrCardNumber) subtitleParts.push(d.src.ocrCardNumber);
      if (d.rar) subtitleParts.push(d.rar);
      const trend = d.src.trend ?? [];
      const data: CardSpotlightData = {
        imageUrl: d.imageUrl,
        emojiFallback: '🃏',
        name: d.name,
        subtitle: subtitleParts.join(' · ') || null,
        gradeLabel: d.src.gradeEstimate ?? null,
        priceLabel: d.priceJpy > 0 ? format(d.priceJpy) : null,
        trend,
        currencySymbol: '¥',
      };
      setSpotlight({ data, origin });
    },
    [format],
  );

  return (
    <View style={{ flex: 1, backgroundColor: tc.paper }}>
      <AppBar title="내 컬렉션" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* 토탈 포트폴리오 — 컬렉션 상단에는 메인 설정과 무관하게 항상 노출. */}
        <View style={{ height: 12 }} />
        <PortfolioHero />
        {loading && !data ? (
          <View style={{ paddingTop: 30 }}><LoadingState /></View>
        ) : error ? (
          <View style={{ marginHorizontal: 14, marginTop: 14 }}>
            <ErrorView error={error} onRetry={refresh} />
          </View>
        ) : display.length === 0 ? (
          <View style={{ marginHorizontal: 14, marginTop: 30 }}>
            <EmptyState
              icon="🃏"
              title="저장된 카드가 없어요"
              desc="시세 상세 페이지의 [내 컬렉션] 버튼으로 추가하세요."
              ctaLabel="가격 탐색"
              onCtaPress={() => router.push('/cards/packs' as never)}
            />
          </View>
        ) : (
          <>
            {/* 요약 스트립 */}
            <View style={styles.strip}>
              <StripCell text={`총 ${filtered.length}장`} bg={tc.ink} fg={tc.gold} />
              <StripCell text={format(totalJpy)} bg={tc.gold} fg={tc.ink} />
              <StripCell text={`그레이딩 ${gradedN}`} bg={tc.pur} fg={tc.white} />
            </View>

            {/* 검색 */}
            <View style={{ paddingHorizontal: space.gap, marginBottom: 2 }}>
              <PixelFrame shadow={5} inner={3}>
                <View style={styles.searchRow}>
                  <PixelText variant={txt} size={14}>🔍</PixelText>
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="카드명 검색..."
                    placeholderTextColor={tc.ink3}
                    style={styles.searchInput}
                  />
                </View>
              </PixelFrame>
            </View>

            {/* 등급 탭 (컬렉션에 존재하는 등급만) — 웹 .chip 3D */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {(['all', ...presentRarities] as RarFilter[]).map((r) => (
                <PixelPress
                  key={r}
                  onPress={() => setRar(r)}
                  bg={rar === r ? tc.gold : tc.white}
                  borderWidth={3}
                  shadow={rar === r ? 2 : 4}
                  inner={2}
                >
                  <View style={styles.chipInner}>
                    <PixelText variant={txt} size={9} color={tc.ink}>
                      {r === 'all' ? 'ALL' : r}
                    </PixelText>
                  </View>
                </PixelPress>
              ))}
            </ScrollView>

            {/* 정렬 — 웹 .chip 3D */}
            <View style={styles.toolbar}>
              {SORT_TABS.map(([k, lb]) => (
                <PixelPress
                  key={k}
                  onPress={() => setSort(k)}
                  bg={sort === k ? tc.ink : tc.white}
                  borderWidth={3}
                  shadow={sort === k ? 2 : 4}
                  inner={2}
                  hi={sort === k ? null : 'rgba(255,255,255,0.85)'}
                >
                  <View style={styles.sortInner}>
                    <PixelText variant={txt} size={9} color={sort === k ? tc.gold : tc.ink}>
                      {lb}
                    </PixelText>
                  </View>
                </PixelPress>
              ))}
            </View>

            {/* 뷰 탭 — 웹 .cv-subseg (ink 컨테이너 + 입체) */}
            <View style={{ paddingHorizontal: space.gap, marginBottom: space.cg }}>
              <PixelFrame bg={tc.ink} shadow={4} hi={null} lo={null} borderWidth={3}>
                <View style={styles.subseg}>
                  {VIEW_TABS.map(([k, lb]) => (
                    <Pressable
                      key={k}
                      onPress={() => setView(k)}
                      style={[styles.subsegBtn, view === k && styles.subsegBtnOn]}
                    >
                      <PixelText variant={txt} size={10} color={view === k ? tc.ink : tc.pap3}>
                        {lb}
                      </PixelText>
                    </Pressable>
                  ))}
                </View>
              </PixelFrame>
            </View>

            {/* 뷰 본문 */}
            {filtered.length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <PixelText variant={txt} size={10} color={tc.ink3}>
                  필터 결과가 없어요
                </PixelText>
              </View>
            ) : view === 'grid' ? (
              <GridView items={filtered} onPress={openDetail} onDelete={onDelete} format={format} onSpotlight={openSpotlight} />
            ) : view === 'list' ? (
              <ListView items={filtered} onPress={openDetail} onDelete={onDelete} format={format} onSpotlight={openSpotlight} />
            ) : view === 'album' ? (
              <AlbumView items={filtered} onPress={openDetail} onSpotlight={openSpotlight} />
            ) : (
              <FilmView items={filtered} onPress={openDetail} format={format} onSpotlight={openSpotlight} />
            )}
          </>
        )}
      </ScrollView>

      <CardSpotlightModal
        data={spotlight?.data ?? null}
        origin={spotlight?.origin ?? null}
        onClose={() => setSpotlight(null)}
      />
    </View>
  );
}

/* ────────────── views ────────────── */

function GridView({
  items, onPress, onDelete, format, onSpotlight,
}: {
  items: Display[];
  onPress: (d: Display) => void;
  onDelete: (id: number) => void;
  format: (jpy: number) => string;
  onSpotlight: (d: Display, origin: SpotlightOrigin | null) => void;
}) {
  return (
    <View style={styles.grid}>
      {items.map((d) => (
        <GridCell key={d.src.id} d={d} onPress={onPress} onDelete={onDelete} format={format} onSpotlight={onSpotlight} />
      ))}
    </View>
  );
}

function GridCell({
  d, onPress, onDelete, format, onSpotlight,
}: {
  d: Display;
  onPress: (d: Display) => void;
  onDelete: (id: number) => void;
  format: (jpy: number) => string;
  onSpotlight: (d: Display, origin: SpotlightOrigin | null) => void;
}) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const thumbRef = useRef<RNView | null>(null);
  return (
    <PixelFrame shadow={5} inner={3} style={styles.gridCell}>
      <View>
        <Pressable onPress={() => onPress(d)}>
          {/* 썸네일을 ref 로 잡아두고 🔍 누를 때 measureInWindow 로 origin 캡처 */}
          <View ref={thumbRef} collapsable={false}>
            <CardImage d={d} aspect />
          </View>
          <View style={{ padding: 7 }}>
            <PixelText variant="ko" size={10} numberOfLines={2} weight="bold">
              {d.name}
            </PixelText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
              <RarBadgeMini rar={d.rar} />
              {d.gradeNum != null && (
                <PixelText variant={txt} size={8} color={tc.goldDk}>
                  P{d.gradeNum}
                </PixelText>
              )}
            </View>
            <PixelText
              variant={txt}
              size={d.priceJpy > 0 ? autoPriceSize(format(d.priceJpy), 10, 7) : 10}
              color={tc.grnDk}
              numberOfLines={1}
              style={{ marginTop: 5 }}
            >
              {d.priceJpy > 0 ? format(d.priceJpy) : '시세 없음'}
            </PixelText>
          </View>
        </Pressable>
        <SpotlightButton
          targetRef={thumbRef}
          onCaptured={(o) => onSpotlight(d, o)}
        />
        {/* 웹 .cv-lc-btn 처럼 거래 + 삭제 나란히. */}
        <View style={styles.gridBtnRow}>
          <Pressable
            onPress={() => router.push(`/write/trade?userCardId=${d.src.id}&title=${encodeURIComponent(d.name)}` as never)}
            style={[styles.gridBtn, { backgroundColor: tc.ink }]}
          >
            <PixelText variant={txt} size={8} color={tc.gold}>거래</PixelText>
          </Pressable>
          <Pressable
            onPress={() => onDelete(d.src.id)}
            style={[styles.gridBtn, { borderLeftWidth: 2, borderLeftColor: tc.ink }]}
          >
            <PixelText variant={txt} size={8} color={tc.red}>삭제</PixelText>
          </Pressable>
        </View>
      </View>
    </PixelFrame>
  );
}

/**
 * 🔍 스포트라이트 trigger — 카드 우상단에 floating 으로 얹는다.
 * 클릭하면 targetRef (= 썸네일 View) 의 화면 좌표를 measureInWindow 로 잡아
 * onCaptured 로 넘긴다. 그 좌표가 모달 FLIP 애니메이션의 origin 이 됨.
 */
function SpotlightButton({
  targetRef,
  onCaptured,
}: {
  targetRef: React.RefObject<RNView | null>;
  onCaptured: (origin: SpotlightOrigin | null) => void;
}) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <Pressable
      onPress={() => {
        const node = targetRef.current;
        if (!node) {
          onCaptured(null);
          return;
        }
        // measureInWindow 는 비동기 — 콜백으로 윈도우 좌표(absolute) 반환.
        node.measureInWindow((x, y, width, height) => {
          if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) {
            onCaptured(null);
          } else {
            onCaptured({ x, y, width, height });
          }
        });
      }}
      accessibilityLabel="카드 자세히 보기"
      style={spotBtnStyles.btn}
    >
      <PixelText variant={txt} size={11} color={tc.gold}>🔍</PixelText>
    </Pressable>
  );
}

const spotBtnStyles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});

function ListView({
  items, onPress, onDelete, format, onSpotlight,
}: {
  items: Display[];
  onPress: (d: Display) => void;
  onDelete: (id: number) => void;
  format: (jpy: number) => string;
  onSpotlight: (d: Display, origin: SpotlightOrigin | null) => void;
}) {
  return (
    <View style={{ paddingHorizontal: space.gap }}>
      {items.map((d) => (
        <ListRow key={d.src.id} d={d} onPress={onPress} onDelete={onDelete} format={format} onSpotlight={onSpotlight} />
      ))}
    </View>
  );
}

function ListRow({
  d, onPress, onDelete, format, onSpotlight,
}: {
  d: Display;
  onPress: (d: Display) => void;
  onDelete: (id: number) => void;
  format: (jpy: number) => string;
  onSpotlight: (d: Display, origin: SpotlightOrigin | null) => void;
}) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const thumbRef = useRef<RNView | null>(null);
  const trend = d.src.trend;
  return (
        <PixelFrame shadow={6} style={{ marginBottom: space.cg }}>
            <View style={styles.listInner}>
              {/* 썸네일 + 본문 (탭하면 상세) */}
              <Pressable onPress={() => onPress(d)} style={styles.listMain}>
                <View ref={thumbRef} collapsable={false}>
                  <CardImage d={d} thumb />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PixelText variant="ko" size={11} weight="bold" numberOfLines={1}>
                    {d.name}
                  </PixelText>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 5 }}>
                    <RarBadgeMini rar={d.rar} />
                    {d.gradeNum != null && (
                      <PixelText variant={txt} size={8} color={tc.goldDk}>
                        PSA {d.gradeNum}
                      </PixelText>
                    )}
                  </View>
                  {/* 시세 + 등락률 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'nowrap' }}>
                    <PixelText
                      variant={txt}
                      size={d.priceJpy > 0 ? autoPriceSize(format(d.priceJpy), 10, 7) : 10}
                      color={tc.grnDk}
                      numberOfLines={1}
                    >
                      {d.priceJpy > 0 ? format(d.priceJpy) : '시세 없음'}
                    </PixelText>
                    <ChangeBadge trend={trend} />
                  </View>
                </View>
              </Pressable>

              {/* 우측: 미니 차트 + 거래/삭제 */}
              <View style={styles.listSide}>
                {trend && trend.length >= 2 ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <MiniSparkline points={trend} />
                    <PixelText variant={txt} size={7} color={tc.ink3} style={{ marginTop: 2 }}>
                      최근 추이
                    </PixelText>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <PixelPress
                    onPress={() => {
                      const node = thumbRef.current;
                      if (!node) {
                        onSpotlight(d, null);
                        return;
                      }
                      node.measureInWindow((x, y, width, height) => {
                        if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) {
                          onSpotlight(d, null);
                        } else {
                          onSpotlight(d, { x, y, width, height });
                        }
                      });
                    }}
                    bg={tc.ink}
                    borderWidth={2}
                    shadow={2}
                    inner={2}
                    hi="rgba(255,255,255,0.25)"
                    lo={null}
                  >
                    <View style={{ paddingHorizontal: 9, paddingVertical: 5 }}>
                      <PixelText variant={txt} size={8} color={tc.gold}>🔍</PixelText>
                    </View>
                  </PixelPress>
                  <PixelPress
                    onPress={() => router.push(`/write/trade?userCardId=${d.src.id}&title=${encodeURIComponent(d.name)}` as never)}
                    bg={tc.ink}
                    borderWidth={2}
                    shadow={2}
                    inner={2}
                    hi="rgba(255,255,255,0.25)"
                    lo={null}
                  >
                    <View style={{ paddingHorizontal: 9, paddingVertical: 5 }}>
                      <PixelText variant={txt} size={8} color={tc.gold}>거래</PixelText>
                    </View>
                  </PixelPress>
                  <PixelPress
                    onPress={() => onDelete(d.src.id)}
                    bg={tc.white}
                    borderWidth={2}
                    shadow={2}
                    inner={2}
                    hi="rgba(255,255,255,0.25)"
                    lo={null}
                  >
                    <View style={{ paddingHorizontal: 9, paddingVertical: 5 }}>
                      <PixelText variant={txt} size={8} color={tc.red}>삭제</PixelText>
                    </View>
                  </PixelPress>
                </View>
              </View>
            </View>
          </PixelFrame>
  );
}

function ChangeBadge({ trend }: { trend: number[] | undefined }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const ch = changeFromTrend(trend);
  if (!ch) return null;
  return (
    <PixelText variant={txt} size={8} color={CHANGE_COLOR[ch.dir]} style={{ marginLeft: 6 }}>
      {CHANGE_ARROW[ch.dir]} {Math.abs(ch.pct).toFixed(1)}%
    </PixelText>
  );
}

function MiniSparkline({ points }: { points: number[] }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const w = 60;
  const h = 26;
  if (!Array.isArray(points) || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const yOf = (v: number) => h - ((v - min) / range) * (h - 4) - 2;
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${yOf(v).toFixed(1)}`)
    .join(' ');
  const up = points[points.length - 1] >= points[0];
  const color = up ? tc.red : tc.blu;
  const lastX = (points.length - 1) * stepX;
  const lastY = yOf(points[points.length - 1]);
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={lastX} cy={lastY} r={2} fill={color} />
    </Svg>
  );
}

function AlbumView({
  items, onPress, onSpotlight,
}: {
  items: Display[];
  onPress: (d: Display) => void;
  onSpotlight: (d: Display, origin: SpotlightOrigin | null) => void;
}) {
  return (
    <View style={[styles.grid, { gap: 3 }]}>
      {items.map((d) => (
        <AlbumCell key={d.src.id} d={d} onPress={onPress} onSpotlight={onSpotlight} />
      ))}
    </View>
  );
}

function AlbumCell({
  d, onPress, onSpotlight,
}: {
  d: Display;
  onPress: (d: Display) => void;
  onSpotlight: (d: Display, origin: SpotlightOrigin | null) => void;
}) {
  const thumbRef = useRef<RNView | null>(null);
  return (
    <View style={[styles.gridItem, { width: '32%' }]}>
      <Pressable onPress={() => onPress(d)}>
        <View ref={thumbRef} collapsable={false}>
          <CardImage d={d} aspect />
        </View>
      </Pressable>
      <SpotlightButton targetRef={thumbRef} onCaptured={(o) => onSpotlight(d, o)} />
    </View>
  );
}

function FilmView({
  items, onPress, format, onSpotlight,
}: {
  items: Display[];
  onPress: (d: Display) => void;
  format: (jpy: number) => string;
  onSpotlight: (d: Display, origin: SpotlightOrigin | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space.gap, gap: 8 }}
    >
      {items.map((d) => (
        <FilmTile key={d.src.id} d={d} onPress={onPress} format={format} onSpotlight={onSpotlight} />
      ))}
    </ScrollView>
  );
}

function FilmTile({
  d, onPress, format, onSpotlight,
}: {
  d: Display;
  onPress: (d: Display) => void;
  format: (jpy: number) => string;
  onSpotlight: (d: Display, origin: SpotlightOrigin | null) => void;
}) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const thumbRef = useRef<RNView | null>(null);
  return (
    <View style={styles.filmTile}>
      <Pressable onPress={() => onPress(d)}>
        <View ref={thumbRef} collapsable={false}>
          <CardImage d={d} aspect />
        </View>
        <PixelText variant="ko" size={9} numberOfLines={1} style={{ marginTop: 6 }}>
          {d.name}
        </PixelText>
        {d.priceJpy > 0 && (
          <PixelText variant={txt} size={8} color={tc.grnDk} numberOfLines={1}>
            {format(d.priceJpy)}
          </PixelText>
        )}
      </Pressable>
      <SpotlightButton targetRef={thumbRef} onCaptured={(o) => onSpotlight(d, o)} />
    </View>
  );
}

/* ────────────── atoms ────────────── */

function CardImage({
  d, aspect, thumb,
}: {
  d: Display;
  aspect?: boolean;
  thumb?: boolean;
}) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const sizeStyle = thumb
    ? { width: 52, height: 72 }
    : aspect
      ? { width: '100%' as const, aspectRatio: 63 / 88 }
      : { height: 110 };
  const bg = tc.ink2;
  if (d.imageUrl) {
    return (
      <Image
        source={{ uri: d.imageUrl }}
        style={[sizeStyle, { backgroundColor: bg, borderColor: tc.ink, borderWidth: thumb ? 2 : 0 }]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[sizeStyle, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderColor: tc.ink, borderWidth: thumb ? 2 : 0 }]}>
      <PixelText variant={txt} size={thumb ? 22 : 28} color={tc.gold}>🃏</PixelText>
    </View>
  );
}

function RarBadgeMini({ rar }: { rar: Rarity }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={{ backgroundColor: RARITY_BG[rar], paddingHorizontal: 5, paddingVertical: 2 }}>
      <PixelText variant={txt} size={7} color={RARITY_FG[rar]}>
        {rar}
      </PixelText>
    </View>
  );
}

function StripCell({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={[styles.stripCell, { backgroundColor: bg }]}>
      <PixelText variant={txt} size={9} color={fg}>{text}</PixelText>
    </View>
  );
}

/* ────────────── styles ────────────── */
const styles = StyleSheet.create({
  // 웹 .cv-strip — 셀 상/하단에만 3px ink 라인 (좌우/드롭 없음).
  strip: {
    flexDirection: 'row',
    marginHorizontal: space.gap,
    marginTop: 14,
    marginBottom: space.cg,
  },
  stripCell: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.ink,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: fonts.ko, fontSize: 14, color: colors.ink, paddingVertical: 10 },
  chipRow: { paddingHorizontal: space.gap, gap: 8, alignItems: 'center', marginBottom: 10, paddingTop: 8 },
  chipInner: { paddingHorizontal: 10, height: 26, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', gap: 8, marginHorizontal: space.gap, marginBottom: space.cg },
  sortInner: { paddingHorizontal: 10, paddingVertical: 6 },
  subseg: {
    flexDirection: 'row',
    padding: 3,
    gap: 3,
  },
  subsegBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.ink2,
  },
  subsegBtnOn: { backgroundColor: colors.gold },
  // flex-start + gap: 항목이 항상 좌→우 순서대로 채워진다(2개만 있어도 양끝으로 벌어지지 않음).
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 7, paddingHorizontal: space.gap },
  gridCell: { width: '31%' },
  gridItem: {
    width: '32%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  gridBtnRow: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: colors.ink },
  gridBtn: { flex: 1, paddingVertical: 5, alignItems: 'center' },
  listInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  listMain: { flex: 1, flexDirection: 'row', gap: 12, minWidth: 0 },
  listSide: { flexShrink: 0, alignItems: 'flex-end' },
  filmTile: { width: 100 },
});
