/**
 * /my/cards — 내 카드 컬렉션.
 *
 * 웹 MyCardsScreen 과 동일한 4 view (그리드/리스트/앨범/필름) + 등급 탭 + 정렬.
 * 서버에서 /api/me/cards/with-prices 로 enriched MyCardRow 가져와 표시.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { EmptyState, ErrorView, LoadingState } from '@/components/cv/ListState';
import { InlineLoginGate } from '@/components/InlineLoginGate';
import { useCurrency } from '@/components/CurrencyProvider';
import { useToast } from '@/components/ToastProvider';
import { colors, fonts, space } from '@/theme/tokens';
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

function toDisplay(c: MyCardRow): Display {
  const raw =
    c.nickname ||
    c.snkrdunkName ||
    c.cardId ||
    (c.ocrSetCode || c.ocrCardNumber
      ? `${c.ocrSetCode ?? '?'} ${c.ocrCardNumber ?? ''}`.trim()
      : '미식별 카드');
  return {
    src: c,
    name: localizeCardName(raw),
    imageUrl: c.photoUrl || c.snkrdunkImageUrl || null,
    rar: detectRarity(c.nickname, c.snkrdunkName, c.cardId),
    gradeNum: parsePsa(c.gradeEstimate),
    priceJpy: c.snkrdunkMinPriceJpy ?? 0,
  };
}

function parsePsa(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/PSA\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function useAuthed(): boolean {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  useEffect(() => subscribeSession(() => setAuthed(isAuthenticated())), []);
  return authed;
}

export default function MyCardsScreen() {
  const authed = useAuthed();
  const { format } = useCurrency();
  const toast = useToast();

  const [view, setView] = useState<ViewMode>('grid');
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

  const display: Display[] = (data ?? []).map(toDisplay);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar title="내 컬렉션" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
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
              <StripCell text={`총 ${filtered.length}장`} bg={colors.ink} fg={colors.gold} />
              <StripCell text={format(totalJpy)} bg={colors.gold} fg={colors.ink} />
              <StripCell text={`그레이딩 ${gradedN}`} bg={colors.pur} fg={colors.white} />
            </View>

            {/* 검색 */}
            <View style={styles.search}>
              <PixelText variant="pixel" size={14}>🔍</PixelText>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="카드명 검색..."
                placeholderTextColor={colors.ink3}
                style={styles.searchInput}
              />
            </View>

            {/* 등급 탭 (컬렉션에 존재하는 등급만) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {(['all', ...presentRarities] as RarFilter[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRar(r)}
                  style={[styles.chip, rar === r && styles.chipOn]}
                >
                  <PixelText
                    variant="pixel"
                    size={9}
                    color={rar === r ? colors.ink : colors.ink}
                  >
                    {r === 'all' ? 'ALL' : r}
                  </PixelText>
                </Pressable>
              ))}
            </ScrollView>

            {/* 정렬 */}
            <View style={styles.toolbar}>
              {SORT_TABS.map(([k, lb]) => (
                <Pressable key={k} onPress={() => setSort(k)} style={[styles.sortBtn, sort === k && styles.sortBtnOn]}>
                  <PixelText variant="pixel" size={9} color={sort === k ? colors.gold : colors.ink}>
                    {lb}
                  </PixelText>
                </Pressable>
              ))}
            </View>

            {/* 뷰 탭 */}
            <View style={styles.subseg}>
              {VIEW_TABS.map(([k, lb]) => (
                <Pressable
                  key={k}
                  onPress={() => setView(k)}
                  style={[styles.subsegBtn, view === k && styles.subsegBtnOn]}
                >
                  <PixelText variant="pixel" size={10} color={view === k ? colors.ink : colors.pap3}>
                    {lb}
                  </PixelText>
                </Pressable>
              ))}
            </View>

            {/* 뷰 본문 */}
            {filtered.length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <PixelText variant="pixel" size={10} color={colors.ink3}>
                  필터 결과가 없어요
                </PixelText>
              </View>
            ) : view === 'grid' ? (
              <GridView items={filtered} onPress={openDetail} onDelete={onDelete} format={format} />
            ) : view === 'list' ? (
              <ListView items={filtered} onPress={openDetail} onDelete={onDelete} format={format} />
            ) : view === 'album' ? (
              <AlbumView items={filtered} onPress={openDetail} />
            ) : (
              <FilmView items={filtered} onPress={openDetail} format={format} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ────────────── views ────────────── */

function GridView({
  items, onPress, onDelete, format,
}: {
  items: Display[];
  onPress: (d: Display) => void;
  onDelete: (id: number) => void;
  format: (jpy: number) => string;
}) {
  return (
    <View style={styles.grid}>
      {items.map((d) => (
        <View key={d.src.id} style={styles.gridItem}>
          <Pressable onPress={() => onPress(d)}>
            <CardImage d={d} aspect />
            <View style={{ padding: 7 }}>
              <PixelText variant="ko" size={10} numberOfLines={2} weight="bold">
                {d.name}
              </PixelText>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                <RarBadgeMini rar={d.rar} />
                {d.gradeNum != null && (
                  <PixelText variant="pixel" size={8} color={colors.goldDk}>
                    P{d.gradeNum}
                  </PixelText>
                )}
              </View>
              <PixelText variant="pixel" size={10} color={colors.grnDk} style={{ marginTop: 5 }}>
                {d.priceJpy > 0 ? format(d.priceJpy) : '시세 없음'}
              </PixelText>
            </View>
          </Pressable>
          <Pressable onPress={() => onDelete(d.src.id)} style={styles.deleteBtn}>
            <PixelText variant="pixel" size={9} color={colors.red}>✕ 삭제</PixelText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function ListView({
  items, onPress, onDelete, format,
}: {
  items: Display[];
  onPress: (d: Display) => void;
  onDelete: (id: number) => void;
  format: (jpy: number) => string;
}) {
  return (
    <View style={{ paddingHorizontal: space.gap }}>
      {items.map((d) => (
        <Pressable key={d.src.id} onPress={() => onPress(d)} style={styles.listItem}>
          <CardImage d={d} thumb />
          <View style={{ flex: 1 }}>
            <PixelText variant="ko" size={11} weight="bold" numberOfLines={1}>
              {d.name}
            </PixelText>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 5 }}>
              <RarBadgeMini rar={d.rar} />
              {d.gradeNum != null && (
                <PixelText variant="pixel" size={8} color={colors.goldDk}>
                  PSA {d.gradeNum}
                </PixelText>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
              <PixelText variant="pixel" size={10} color={colors.grnDk}>
                {d.priceJpy > 0 ? format(d.priceJpy) : '시세 없음'}
              </PixelText>
              <Pressable onPress={() => onDelete(d.src.id)}>
                <PixelText variant="pixel" size={9} color={colors.red}>✕</PixelText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function AlbumView({ items, onPress }: { items: Display[]; onPress: (d: Display) => void }) {
  return (
    <View style={[styles.grid, { gap: 5 }]}>
      {items.map((d) => (
        <Pressable key={d.src.id} onPress={() => onPress(d)} style={[styles.gridItem, { width: '31.5%' }]}>
          <CardImage d={d} aspect />
        </Pressable>
      ))}
    </View>
  );
}

function FilmView({
  items, onPress, format,
}: {
  items: Display[];
  onPress: (d: Display) => void;
  format: (jpy: number) => string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space.gap, gap: 8 }}
    >
      {items.map((d) => (
        <Pressable key={d.src.id} onPress={() => onPress(d)} style={styles.filmTile}>
          <CardImage d={d} aspect />
          <PixelText variant="ko" size={9} numberOfLines={1} style={{ marginTop: 6 }}>
            {d.name}
          </PixelText>
          {d.priceJpy > 0 && (
            <PixelText variant="pixel" size={8} color={colors.grnDk} numberOfLines={1}>
              {format(d.priceJpy)}
            </PixelText>
          )}
        </Pressable>
      ))}
    </ScrollView>
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
  const sizeStyle = thumb
    ? { width: 52, height: 72 }
    : aspect
      ? { width: '100%' as const, aspectRatio: 63 / 88 }
      : { height: 110 };
  const bg = colors.ink2;
  if (d.imageUrl) {
    return (
      <Image
        source={{ uri: d.imageUrl }}
        style={[sizeStyle, { backgroundColor: bg, borderColor: colors.ink, borderWidth: thumb ? 2 : 0 }]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[sizeStyle, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderColor: colors.ink, borderWidth: thumb ? 2 : 0 }]}>
      <PixelText variant="pixel" size={thumb ? 22 : 28} color={colors.gold}>🃏</PixelText>
    </View>
  );
}

function RarBadgeMini({ rar }: { rar: Rarity }) {
  return (
    <View style={{ backgroundColor: RARITY_BG[rar], paddingHorizontal: 5, paddingVertical: 2 }}>
      <PixelText variant="pixel" size={7} color={RARITY_FG[rar]}>
        {rar}
      </PixelText>
    </View>
  );
}

function StripCell({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={[styles.stripCell, { backgroundColor: bg }]}>
      <PixelText variant="pixel" size={9} color={fg}>{text}</PixelText>
    </View>
  );
}

/* ────────────── styles ────────────── */
const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    marginHorizontal: space.gap,
    marginTop: 14,
    marginBottom: space.cg,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  stripCell: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    marginHorizontal: space.gap,
    marginBottom: space.cg,
    borderWidth: 3,
    borderColor: colors.ink,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: fonts.ko, fontSize: 14, color: colors.ink, paddingVertical: 10 },
  chipRow: { paddingHorizontal: space.gap, gap: 6, alignItems: 'center', marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderWidth: 2,
  },
  chipOn: { backgroundColor: colors.gold },
  toolbar: { flexDirection: 'row', gap: 4, marginHorizontal: space.gap, marginBottom: space.cg },
  sortBtn: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderWidth: 2,
  },
  sortBtnOn: { backgroundColor: colors.ink },
  subseg: {
    flexDirection: 'row',
    backgroundColor: colors.ink,
    padding: 3,
    marginHorizontal: space.gap,
    marginBottom: space.cg,
    gap: 3,
  },
  subsegBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.ink2,
  },
  subsegBtnOn: { backgroundColor: colors.gold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.gap, gap: 8 },
  gridItem: {
    width: '31%',
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.ink,
    marginBottom: 8,
  },
  deleteBtn: {
    paddingVertical: 5,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: colors.ink,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    padding: 12,
    marginBottom: space.cg,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  filmTile: { width: 100 },
});
