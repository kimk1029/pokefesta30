import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { EmptyState, ErrorView, LoadingState } from '@/components/cv/ListState';
import { fetchAllPacksWithHits, type PackWithHits } from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';
import { colors } from '@/theme/tokens';

type SortMode = 'default' | 'name' | 'price';

export default function PriceInfoScreen() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('default');
  const { data, loading, error, refresh } = useAsync<PackWithHits[]>(
    () => fetchAllPacksWithHits(1),
    [],
  );

  const packs = data ?? [];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = q
      ? packs.filter((p) =>
          [p.name, p.shortName, p.boxKoName, p.boxName, p.code]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
      : packs;

    if (sort === 'name') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    if (sort === 'price') {
      rows = [...rows].sort((a, b) => packTopPrice(b) - packTopPrice(a));
    }
    return rows;
  }, [packs, query, sort]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar title="시세 정보" />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginHorizontal: 14, marginTop: 14, marginBottom: 12 }}>
          <PixelFrame bg={colors.white} borderWidth={3} shadow={5} hi={null} lo={null}>
            <View style={{ padding: 14 }}>
              <PixelText variant="pixel" size={12} color={colors.ink} style={{ letterSpacing: 0.8 }}>
                포켓몬 카드 박스
              </PixelText>
              <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 7, lineHeight: 16 }}>
                박스를 선택하면 해당 박스에 포함된 싱글카드 시세를 확인할 수 있습니다.
              </PixelText>
            </View>
          </PixelFrame>
        </View>

        <View style={styles.searchBox}>
          <PixelText variant="pixel" size={13} color={colors.ink3}>🔍</PixelText>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="박스명, 팩명 검색..."
            placeholderTextColor={colors.ink4}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.sortRow}>
          {([
            ['default', '최신/추천'],
            ['price', '가격 높은순'],
            ['name', '이름순'],
          ] as const).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setSort(key)}
              style={[styles.sortBtn, sort === key && styles.sortBtnOn]}
            >
              <PixelText variant="pixel" size={9} color={sort === key ? colors.gold : colors.ink}>
                {label}
              </PixelText>
            </Pressable>
          ))}
        </View>

        {loading && !data ? (
          <LoadingState />
        ) : error ? (
          <View style={{ marginHorizontal: 14, marginTop: 6 }}>
            <ErrorView error={error} onRetry={refresh} />
          </View>
        ) : visible.length === 0 ? (
          <View style={{ marginHorizontal: 14, marginTop: 6 }}>
            <EmptyState icon="📦" title="표시할 박스가 없어요" ctaLabel="다시 불러오기" onCtaPress={refresh} />
          </View>
        ) : (
          <View style={{ marginHorizontal: 14, gap: 10 }}>
            {visible.map((pack) => (
              <PackRow key={pack.code} pack={pack} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PackRow({ pack }: { pack: PackWithHits }) {
  const topPrice = packTopPrice(pack);
  const firstHit = pack.hits[0] ?? null;
  return (
    <PixelPress
      onPress={() => router.push(`/cards/packs/${pack.code}` as never)}
      bg={colors.white}
      borderWidth={3}
      shadow={5}
      hi={null}
      lo={null}
    >
      <View style={styles.packRow}>
        <View style={[styles.thumb, { backgroundColor: pack.bg }]}>
          {pack.boxImageUrl ? (
            <Image source={{ uri: pack.boxImageUrl }} style={styles.thumbImg} resizeMode="contain" />
          ) : (
            <Text style={{ fontSize: 24 }}>{pack.emoji}</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PixelText variant="ko" size={12} weight="bold" numberOfLines={1}>
            {pack.name}
          </PixelText>
          <PixelText variant="ko" size={9} color={colors.ink3} style={{ marginTop: 5, lineHeight: 14 }} numberOfLines={2}>
            {pack.boxKoName || pack.boxName || pack.shortName}
          </PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
            <PricePill text={topPrice > 0 ? `대표 ¥${topPrice.toLocaleString('ja-JP')}` : '시세 확인 중'} />
            {firstHit?.listingCountText ? <MetaPill text={`매물 ${firstHit.listingCountText}건`} /> : null}
          </View>
        </View>
        <PixelText variant="pixel" size={14} color={colors.ink3}>›</PixelText>
      </View>
    </PixelPress>
  );
}

function PricePill({ text }: { text: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: colors.red }]}>
      <PixelText variant="pixel" size={8} color={colors.white}>{text}</PixelText>
    </View>
  );
}

function MetaPill({ text }: { text: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: colors.pap2 }]}>
      <PixelText variant="pixel" size={8} color={colors.ink3}>{text}</PixelText>
    </View>
  );
}

function packTopPrice(pack: PackWithHits): number {
  return Math.max(0, ...pack.hits.map((h) => h.minPrice || 0));
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderWidth: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'Galmuri11',
    color: colors.ink,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 12,
  },
  sortBtn: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderWidth: 2,
  },
  sortBtnOn: {
    backgroundColor: colors.ink,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  thumb: {
    width: 68,
    height: 68,
    borderColor: colors.ink,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderColor: colors.ink,
    borderWidth: 1,
  },
});
