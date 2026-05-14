import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { colors, space } from '@/theme/tokens';

type ViewMode = 'grid' | 'list';
type Rar = 'all' | 'C' | 'A' | 'B' | 'S';

interface Card {
  id: number;
  name: string;
  set: string;
  game: string;
  rar: 'C' | 'A' | 'B' | 'S';
  emoji: string;
  price: number;
  grade?: number;
}

const MOCK_CARDS: Card[] = [
  { id: 1, name: '리자몽 EX', set: '스칼렛&바이올렛', game: '포켓몬', rar: 'S', emoji: '🔥', price: 128_000, grade: 9 },
  { id: 2, name: '피카츄 VMAX', set: '비비드볼트', game: '포켓몬', rar: 'A', emoji: '⚡', price: 85_000 },
  { id: 3, name: '블랙 로터스', set: '언리미티드', game: 'MTG', rar: 'S', emoji: '🌹', price: 450_000, grade: 8 },
  { id: 4, name: '우루스', set: '오리엔트', game: '원피스', rar: 'A', emoji: '🌊', price: 32_000 },
  { id: 5, name: '카이바 슈라이', set: 'LOB', game: '유희왕', rar: 'B', emoji: '🐉', price: 220_000, grade: 10 },
  { id: 6, name: '뮤츠 V', set: '폭염의 모노가타리', game: '포켓몬', rar: 'A', emoji: '🧬', price: 41_000 },
];

const GAME_COLORS: Record<string, string> = {
  포켓몬: '#E63946',
  유희왕: '#7C3AED',
  원피스: '#F97316',
  MTG: '#22C55E',
};

export default function MyCardsScreen() {
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [game, setGame] = useState('전체');
  const [rar, setRar] = useState<Rar>('all');

  const games = ['전체', ...Array.from(new Set(MOCK_CARDS.map((c) => c.game)))];

  const filtered = useMemo(
    () =>
      MOCK_CARDS.filter(
        (c) =>
          (game === '전체' || c.game === game) &&
          (rar === 'all' || c.rar === rar) &&
          (search === '' || c.name.includes(search) || c.game.includes(search)),
      ),
    [game, rar, search],
  );

  const totalVal = filtered.reduce((s, c) => s + c.price, 0);
  const gradedN = filtered.filter((c) => c.grade).length;

  return (
    <View style={{ flex: 1 }}>
      <AppBar title="내 컬렉션" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* SUMMARY STRIP */}
        <View style={styles.strip}>
          <StripCell text={`총 ${filtered.length}장`} bg={colors.ink} fg={colors.gold} />
          <StripCell text={`₩${totalVal.toLocaleString()}`} bg={colors.gold} fg={colors.ink} />
          <StripCell text={`${gradedN}건 그레이딩`} bg={colors.pur} fg={colors.white} />
        </View>

        {/* SEARCH */}
        <View style={styles.search}>
          <PixelText variant="pixel" size={14}>🔍</PixelText>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="카드명, 게임 검색..."
            placeholderTextColor={colors.ink3}
            style={styles.searchInput}
          />
        </View>

        {/* GAME CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {games.map((g) => (
            <Chip key={g} label={g === '전체' ? 'ALL' : g} on={game === g} onPress={() => setGame(g)} />
          ))}
        </ScrollView>

        {/* RARITY CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(['all', 'S', 'A', 'B', 'C'] as Rar[]).map((r) => (
            <Chip key={r} label={r === 'all' ? 'ALL' : r} on={rar === r} onPress={() => setRar(r)} />
          ))}
        </ScrollView>

        {/* TOOLBAR */}
        <View style={styles.toolbar}>
          <View style={{ flex: 1 }} />
          <Pressable
            style={[styles.viewBtn, view === 'grid' && styles.viewBtnOn]}
            onPress={() => setView('grid')}
          >
            <PixelText variant="pixel" size={13} color={view === 'grid' ? colors.gold : colors.ink}>
              ⊞
            </PixelText>
          </Pressable>
          <Pressable
            style={[styles.viewBtn, view === 'list' && styles.viewBtnOn]}
            onPress={() => setView('list')}
          >
            <PixelText variant="pixel" size={13} color={view === 'list' ? colors.gold : colors.ink}>
              ☰
            </PixelText>
          </Pressable>
        </View>

        {filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <PixelText variant="pixel" size={10} color={colors.ink3}>
              검색 결과가 없어요
            </PixelText>
          </View>
        ) : view === 'grid' ? (
          <View style={styles.grid}>
            {filtered.map((c) => (
              <View key={c.id} style={styles.gridItem}>
                <View
                  style={[
                    styles.gridImg,
                    { backgroundColor: `${GAME_COLORS[c.game] ?? '#1E293B'}33` },
                  ]}
                >
                  <PixelText variant="pixel" size={28}>
                    {c.emoji}
                  </PixelText>
                </View>
                <View style={{ padding: 8 }}>
                  <PixelText variant="pixel" size={8} numberOfLines={1} style={{ marginBottom: 5 }}>
                    {c.name}
                  </PixelText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <RarBadge rar={c.rar} />
                    {c.grade && <GradeBadge g={c.grade} />}
                  </View>
                  <PixelText variant="pixel" size={8} color={colors.grnDk} style={{ marginTop: 5 }}>
                    ₩{c.price.toLocaleString()}
                  </PixelText>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: space.gap }}>
            {filtered.map((c) => (
              <View key={c.id} style={styles.listItem}>
                <View
                  style={[
                    styles.listThumb,
                    { backgroundColor: `${GAME_COLORS[c.game] ?? '#1E293B'}33` },
                  ]}
                >
                  <PixelText variant="pixel" size={22}>
                    {c.emoji}
                  </PixelText>
                </View>
                <View style={{ flex: 1 }}>
                  <PixelText variant="pixel" size={10} style={{ marginBottom: 6 }}>
                    {c.name}
                  </PixelText>
                  <PixelText variant="pixel" size={8} color={colors.ink3} style={{ marginBottom: 6 }}>
                    {c.set} · {c.game}
                  </PixelText>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <RarBadge rar={c.rar} />
                    {c.grade && <GradeBadge g={c.grade} />}
                  </View>
                  <PixelText variant="pixel" size={10} color={colors.grnDk}>
                    ₩{c.price.toLocaleString()}
                  </PixelText>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StripCell({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={[styles.stripCell, { backgroundColor: bg }]}>
      <PixelText variant="pixel" size={9} color={fg}>
        {text}
      </PixelText>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && { backgroundColor: colors.gold }]}
    >
      <PixelText variant="pixel" size={8}>
        {label}
      </PixelText>
    </Pressable>
  );
}

function RarBadge({ rar }: { rar: 'C' | 'A' | 'B' | 'S' }) {
  const palette: Record<typeof rar, { bg: string; fg: string }> = {
    C: { bg: colors.rCommon, fg: colors.white },
    A: { bg: colors.rUncommon, fg: colors.ink },
    B: { bg: colors.rRare, fg: colors.white },
    S: { bg: colors.rSecret, fg: colors.ink },
  };
  const { bg, fg } = palette[rar];
  return (
    <View style={[styles.rar, { backgroundColor: bg }]}>
      <PixelText variant="pixel" size={7} color={fg}>
        {rar}
      </PixelText>
    </View>
  );
}

function GradeBadge({ g }: { g: number }) {
  const bg = g >= 10 ? colors.psa10 : g >= 9 ? colors.psa9 : g >= 8 ? colors.psa8 : colors.psa7;
  const fg = g >= 8 && g < 9 ? colors.white : colors.ink;
  return (
    <View style={[styles.grade, { backgroundColor: bg }]}>
      <PixelText variant="pixel" size={9} color={fg}>
        {g}
      </PixelText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    marginHorizontal: space.gap,
    marginBottom: space.cg,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  stripCell: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
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
  searchInput: {
    flex: 1,
    fontFamily: 'Galmuri11',
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 10,
  },
  chipRow: {
    paddingHorizontal: space.gap,
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.gap,
    marginBottom: space.cg,
    gap: 4,
  },
  viewBtn: {
    width: 32,
    height: 32,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnOn: { backgroundColor: colors.ink },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space.gap,
    gap: 8,
  },
  gridItem: {
    width: '31%',
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  gridImg: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink2,
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
  listThumb: {
    width: 52,
    height: 72,
    backgroundColor: colors.ink2,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rar: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  grade: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
