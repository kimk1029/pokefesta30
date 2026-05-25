import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { EmptyState } from '@/components/cv/ListState';
import { colors } from '@/theme/tokens';
import {
  fetchSnkrdunkApparel,
  searchSnkrdunkByQuery,
  type SnkrdunkApparel,
  type SnkrdunkSearchResult,
} from '@/services/snkrdunk';
import { localizeCardName } from '@/lib/cardNameKo';

interface Hit {
  apparelId: number;
  koName: string;
  jpName: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

const KO_TO_JA: Array<[RegExp, string]> = [
  [/리자몽/g, 'リザードン'],
  [/피카츄/g, 'ピカチュウ'],
  [/이브이/g, 'イーブイ'],
  [/블래키/g, 'ブラッキー'],
  [/님피아/g, 'ニンフィア'],
  [/뮤츠/g, 'ミュウツー'],
  [/뮤/g, 'ミュウ'],
  [/팬텀/g, 'ゲンガー'],
  [/루기아/g, 'ルギア'],
  [/레쿠쟈/g, 'レックウザ'],
  [/기라티나/g, 'ギラティナ'],
  [/아르세우스/g, 'アルセウス'],
  [/나오하/g, 'ニャオハ'],
  [/카드/g, 'カード'],
  [/프로모/g, 'プロモ'],
];

function queryForSnkrdunk(q: string): string {
  let out = q.trim();
  for (const [re, ja] of KO_TO_JA) out = out.replace(re, ja);
  return out;
}

async function hydrate(results: SnkrdunkSearchResult[]): Promise<Hit[]> {
  const rows = await Promise.all(
    results.map(async (r) => {
      const apparel: SnkrdunkApparel | null = await fetchSnkrdunkApparel(r.apparelId);
      const jpName = apparel?.localizedName || apparel?.name || r.name;
      return {
        apparelId: r.apparelId,
        koName: localizeCardName(jpName) || jpName,
        jpName,
        imageUrl: apparel?.imageUrl ?? r.imageUrl,
        minPrice: apparel?.minPrice ?? 0,
        listingCountText: apparel?.listingCountText ?? '',
      };
    }),
  );
  return rows;
}

function fmtYen(n: number): string {
  if (!n) return '—';
  return `¥${n.toLocaleString('ja-JP')}`;
}

export default function SnkrdunkSearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = useMemo(() => (params.q ?? '').trim(), [params.q]);
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jaQuery = useMemo(() => queryForSnkrdunk(initialQuery), [initialQuery]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    let alive = true;
    setPage(1);
    setHasMore(false);
    if (!initialQuery) {
      setHits([]);
      return;
    }
    setLoading(true);
    setError(null);
    searchSnkrdunkByQuery(jaQuery, 1)
      .then(async (raw) => ({ rows: await hydrate(raw), more: raw.length > 0 }))
      .then(({ rows, more }) => {
        if (!alive) return;
        setHits(rows);
        setHasMore(more);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : '검색 실패');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [initialQuery, jaQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore || !jaQuery) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const raw = await searchSnkrdunkByQuery(jaQuery, next);
      const rows = await hydrate(raw);
      const seen = new Set(hits.map((h) => h.apparelId));
      const fresh = rows.filter((r) => !seen.has(r.apparelId));
      if (fresh.length > 0) setHits((prev) => [...prev, ...fresh]);
      setPage(next);
      // 새 항목이 하나라도 있었으면 다음 페이지를 더 시도, 없으면 끝.
      setHasMore(fresh.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, hasMore, jaQuery, page, hits]);

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    router.setParams({ q });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title="카드 검색" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 110 }}
        scrollEventThrottle={200}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          // 바닥 600px 이내로 스크롤되면 다음 페이지 자동 로딩 (loadMore 내부에서 중복/종료 가드)
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 600) loadMore();
        }}
      >
        <PixelFrame bg={colors.white} borderWidth={3} shadow={5}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
            <PixelText variant="pixel" size={12} color={colors.ink3}>🔍</PixelText>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submit}
              returnKeyType="search"
              inputMode="search"
              placeholder="한국어로 카드 검색 (예: 리자몽, 피카츄)"
              placeholderTextColor={colors.ink4}
              style={{
                flex: 1,
                height: 44,
                paddingHorizontal: 8,
                color: colors.ink,
                fontFamily: 'Galmuri11',
                fontSize: 12,
              }}
            />
            <Pressable onPress={submit} style={{ backgroundColor: colors.ink, paddingHorizontal: 10, paddingVertical: 8 }}>
              <PixelText variant="pixel" size={8} color={colors.gold}>검색</PixelText>
            </Pressable>
          </View>
        </PixelFrame>

        <View style={{ height: 14 }} />

        {!initialQuery ? (
          <EmptyState icon="🔍" title="카드를 검색하세요" desc="한국어 카드명으로 SNKRDUNK 매물을 찾습니다." />
        ) : loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : error ? (
          <EmptyState icon="!" title="검색 실패" desc={error} />
        ) : hits.length === 0 ? (
          <EmptyState icon="🔍" title="검색 결과가 없습니다" desc={initialQuery} />
        ) : (
          <View style={{ gap: 10 }}>
            {hits.map((hit) => (
              <PixelPress
                key={hit.apparelId}
                onPress={() => router.push(`/cards/snkrdunk/${hit.apparelId}` as never)}
                bg={colors.white}
                borderWidth={3}
                shadow={5}
                hi={null}
                lo={null}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
                  <View
                    style={{
                      width: 76,
                      height: 76,
                      backgroundColor: colors.pap2,
                      borderColor: colors.ink,
                      borderWidth: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {hit.imageUrl ? (
                      <Image source={{ uri: hit.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 24 }}>🃏</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PixelText variant="ko" size={12} weight="bold" numberOfLines={2} style={{ lineHeight: 16 }}>
                      {hit.koName}
                    </PixelText>
                    <PixelText variant="pixel" size={8} color={colors.ink3} numberOfLines={1} style={{ marginTop: 5 }}>
                      {hit.jpName}
                    </PixelText>
                    <PixelText variant="pixel" size={8} color={colors.ink3} numberOfLines={1} style={{ marginTop: 5 }}>
                      {hit.listingCountText ? `매물 ${hit.listingCountText}건` : ' '}
                    </PixelText>
                  </View>
                  <PixelText variant="pixel" size={10} color={colors.red} numberOfLines={1}>
                    {fmtYen(hit.minPrice)}
                  </PixelText>
                </View>
              </PixelPress>
            ))}
            {loadingMore ? (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <ActivityIndicator color={colors.ink} />
              </View>
            ) : !hasMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <PixelText variant="pixel" size={8} color={colors.ink3}>
                  검색 결과 {hits.length}건 · 끝
                </PixelText>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
