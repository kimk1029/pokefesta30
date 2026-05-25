import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
import { bunjangSearchUrl, fetchBunjangItems, type BunjangItem } from '@/services/marketplace';
import { localizeCardName } from '@/lib/cardNameKo';
import { koToJaSearch } from '@/lib/cardSearchJa';

type Category = 'snkrdunk' | 'bunjang' | 'kream';

function kreamSearchUrl(q: string): string {
  return `https://kream.co.kr/search?keyword=${encodeURIComponent(q)}`;
}

interface Hit {
  apparelId: number;
  koName: string;
  jpName: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
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
  const [cat, setCat] = useState<Category>('snkrdunk');

  // SNKRDUNK (일본어 변환 검색 + 무한스크롤)
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 번개장터 (한국어 원본 검색)
  const [bunjang, setBunjang] = useState<BunjangItem[]>([]);
  const [bunjangLoading, setBunjangLoading] = useState(false);
  const [bunjangLoaded, setBunjangLoaded] = useState(false);
  const [bunjangError, setBunjangError] = useState<string | null>(null);

  const jaQuery = useMemo(() => koToJaSearch(initialQuery), [initialQuery]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // 쿼리 변경 시 번개장터 캐시 초기화 (탭 진입 시 다시 로딩)
  useEffect(() => {
    setBunjang([]);
    setBunjangLoaded(false);
    setBunjangError(null);
  }, [initialQuery]);

  // SNKRDUNK 첫 페이지
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

  // 번개장터는 해당 탭을 처음 열 때 지연 로딩 (한국어 원본 쿼리)
  useEffect(() => {
    if (cat !== 'bunjang' || !initialQuery || bunjangLoaded || bunjangLoading) return;
    let alive = true;
    setBunjangLoading(true);
    setBunjangError(null);
    fetchBunjangItems(initialQuery, 0)
      .then((items) => {
        if (!alive) return;
        setBunjang(items);
        setBunjangLoaded(true);
      })
      .catch((e) => {
        if (alive) setBunjangError(e instanceof Error ? e.message : '불러오기 실패');
      })
      .finally(() => {
        if (alive) setBunjangLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cat, initialQuery, bunjangLoaded, bunjangLoading]);

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
          if (cat !== 'snkrdunk') return; // 무한스크롤은 SNKRDUNK 탭만
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
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

        <View style={{ height: 12 }} />

        {!initialQuery ? (
          <EmptyState icon="🔍" title="카드를 검색하세요" desc="SNKRDUNK 시세 + 번개장터 국내매물을 함께 찾습니다." />
        ) : (
          <>
            {/* 카테고리 탭 */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <CatTab
                label="SNKRDUNK"
                sub={hits.length > 0 ? `${hits.length}건${hasMore ? '+' : ''}` : '시세'}
                active={cat === 'snkrdunk'}
                onPress={() => setCat('snkrdunk')}
              />
              <CatTab
                label="번개장터"
                sub={bunjangLoaded ? `${bunjang.length}건` : '국내매물'}
                active={cat === 'bunjang'}
                onPress={() => setCat('bunjang')}
              />
              <CatTab
                label="KREAM"
                sub="바로가기"
                active={cat === 'kream'}
                onPress={() => setCat('kream')}
              />
            </View>

            <View style={{ height: 12 }} />

            {cat === 'snkrdunk' ? (
              loading ? (
                <Spinner />
              ) : error ? (
                <EmptyState icon="!" title="검색 실패" desc={error} />
              ) : hits.length === 0 ? (
                <EmptyState icon="🔍" title="SNKRDUNK 결과가 없습니다" desc={initialQuery} />
              ) : (
                <View style={{ gap: 10 }}>
                  {hits.map((hit) => (
                    <SnkrdunkRow key={hit.apparelId} hit={hit} />
                  ))}
                  {loadingMore ? (
                    <Spinner pad={18} />
                  ) : !hasMore ? (
                    <FooterNote text={`SNKRDUNK ${hits.length}건 · 끝`} />
                  ) : null}
                </View>
              )
            ) : cat === 'bunjang' ? (
              bunjangLoading ? (
                <Spinner />
              ) : bunjangError ? (
                <EmptyState icon="!" title="불러오기 실패" desc={bunjangError} />
              ) : bunjang.length === 0 ? (
                <EmptyState icon="📦" title="번개장터 결과가 없습니다" desc={initialQuery} />
              ) : (
                <View style={{ gap: 10 }}>
                  {bunjang.map((item) => (
                    <BunjangRow key={item.pid} item={item} />
                  ))}
                  <PixelPress
                    onPress={() => Linking.openURL(bunjangSearchUrl(initialQuery))}
                    bg={colors.ink}
                    borderWidth={3}
                    shadow={5}
                    hi={null}
                    lo={null}
                    wrapStyle={{ marginTop: 2 }}
                  >
                    <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                      <PixelText variant="pixel" size={9} color={colors.gold}>번개장터에서 더 보기</PixelText>
                    </View>
                  </PixelPress>
                </View>
              )
            ) : (
              <KreamPanel query={initialQuery} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CatTab({ label, sub, active, onPress }: { label: string; sub: string; active: boolean; onPress: () => void }) {
  return (
    <PixelPress
      onPress={onPress}
      bg={active ? colors.ink : colors.white}
      borderWidth={3}
      shadow={active ? 5 : 3}
      hi={null}
      lo={null}
      wrapStyle={{ flex: 1 }}
    >
      <View style={{ paddingVertical: 8, alignItems: 'center', gap: 3 }}>
        <PixelText variant="pixel" size={9} color={active ? colors.gold : colors.ink}>
          {label}
        </PixelText>
        <PixelText variant="pixel" size={7} color={active ? colors.gold : colors.ink3}>
          {sub}
        </PixelText>
      </View>
    </PixelPress>
  );
}

function Spinner({ pad = 40 }: { pad?: number }) {
  return (
    <View style={{ paddingVertical: pad, alignItems: 'center' }}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

function FooterNote({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: 16, alignItems: 'center' }}>
      <PixelText variant="pixel" size={8} color={colors.ink3}>
        {text}
      </PixelText>
    </View>
  );
}

function SnkrdunkRow({ hit }: { hit: Hit }) {
  return (
    <PixelPress
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
  );
}

function KreamPanel({ query }: { query: string }) {
  return (
    <View style={{ gap: 12 }}>
      <PixelFrame bg={colors.white} borderWidth={3} shadow={5}>
        <View style={{ padding: 14, gap: 8 }}>
          <PixelText variant="ko" size={12} weight="bold">
            KREAM
          </PixelText>
          <PixelText variant="ko" size={10} color={colors.ink3} style={{ lineHeight: 16 }}>
            KREAM은 앱 내 직접 리스팅이 제한돼 있어, KREAM에서 바로 검색 결과를 확인할 수 있어요.
          </PixelText>
        </View>
      </PixelFrame>
      <PixelPress
        onPress={() => Linking.openURL(kreamSearchUrl(query))}
        bg={colors.ink}
        borderWidth={3}
        shadow={5}
        hi={null}
        lo={null}
      >
        <View style={{ paddingVertical: 13, alignItems: 'center' }}>
          <PixelText variant="ko" size={10} color={colors.gold}>
            KREAM에서 “{query}” 검색 →
          </PixelText>
        </View>
      </PixelPress>
    </View>
  );
}

function BunjangRow({ item }: { item: BunjangItem }) {
  return (
    <PixelPress
      onPress={() => Linking.openURL(item.productUrl)}
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
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 24 }}>📦</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PixelText variant="ko" size={12} weight="bold" numberOfLines={2} style={{ lineHeight: 16 }}>
            {item.name}
          </PixelText>
          <PixelText variant="pixel" size={8} color={colors.ink3} numberOfLines={1} style={{ marginTop: 5 }}>
            {(item.location || '지역 미표기') + ' · 찜 ' + item.favCount}
          </PixelText>
        </View>
        <PixelText variant="pixel" size={10} color={colors.red} numberOfLines={1}>
          {item.price > 0 ? `₩${item.price.toLocaleString('ko-KR')}` : '가격문의'}
        </PixelText>
      </View>
    </PixelPress>
  );
}
