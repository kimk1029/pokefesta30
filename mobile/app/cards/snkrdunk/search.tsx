import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { TranslationTicker } from '@/components/TranslationTicker';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { EmptyState } from '@/components/cv/ListState';
import { colors } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import {
  fetchSnkrdunkApparel,
  searchSnkrdunkByQuery,
  type SnkrdunkApparel,
  type SnkrdunkSearchResult,
} from '@/services/snkrdunk';
import {
  bunjangSearchUrl,
  fetchBunjangItems,
  fetchKreamItems,
  type BunjangItem,
  type KreamItem,
} from '@/services/marketplace';
import { localizeCardName } from '@/lib/cardNameKo';
import { koToJaSearch } from '@/lib/cardSearchJa';
import { api } from '@/lib/apiClient';

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
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
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

  // KREAM (한국어 원본 검색, SSR 스크래핑)
  const [kream, setKream] = useState<KreamItem[]>([]);
  const [kreamLoading, setKreamLoading] = useState(false);
  const [kreamLoaded, setKreamLoaded] = useState(false);

  const jaQuery = useMemo(() => koToJaSearch(initialQuery), [initialQuery]);

  useEffect(() => {
    setQuery(initialQuery);
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
        // 검색 로그(한국어 키워드 + snkrdunk 결과 수). 실패는 무시 — 검색 UX 영향 없음.
        api('/api/search-log', {
          method: 'POST',
          body: { query: initialQuery, resultCount: rows.length, source: 'mobile' },
        }).catch(() => undefined);
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

  // 번개장터 — 검색 시 즉시 로딩(다른 탭에 있어도 탭에 건수 표시). 한국어 원본 쿼리.
  // 주의: loading 을 deps 에 넣지 말 것 — setLoading 으로 effect 가 재실행되며 cleanup 이
  // 진행 중 fetch 를 취소해 무한 로딩이 됐던 버그.
  useEffect(() => {
    if (!initialQuery) {
      setBunjang([]);
      setBunjangLoaded(false);
      setBunjangError(null);
      return;
    }
    let alive = true;
    setBunjang([]);
    setBunjangLoaded(false);
    setBunjangError(null);
    setBunjangLoading(true);
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
  }, [initialQuery]);

  // 쿼리 변경 시 KREAM 캐시 리셋 (탭 다시 열면 새 쿼리로 로딩).
  useEffect(() => {
    setKream([]);
    setKreamLoaded(false);
  }, [initialQuery]);

  // KREAM — 탭을 열 때만 1회 로딩 (안티봇이 IP를 막아, 매 검색마다 호출하면 대부분 차단됨).
  // 차단/실패 시 빈 배열 → 이동 버튼 폴백. (loading 은 deps 에 넣지 않음 — orphan 방지)
  useEffect(() => {
    if (cat !== 'kream' || !initialQuery || kreamLoaded || kreamLoading) return;
    let alive = true;
    setKreamLoading(true);
    fetchKreamItems(initialQuery)
      .then((items) => {
        if (!alive) return;
        setKream(items);
        setKreamLoaded(true);
      })
      .catch(() => {
        if (alive) setKreamLoaded(true);
      })
      .finally(() => {
        if (alive) setKreamLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, initialQuery, kreamLoaded]);

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
    <View style={{ flex: 1, backgroundColor: tc.paper }}>
      <AppBar onBack={() => router.back()} title="카드 검색" />
      <TranslationTicker />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 110 }}
        scrollEventThrottle={200}
        onScroll={({ nativeEvent }) => {
          if (cat !== 'snkrdunk') return; // 무한스크롤은 SNKRDUNK 탭만
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 600) loadMore();
        }}
      >
        <PixelFrame bg={tc.white} borderWidth={3} shadow={5}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
            <PixelText variant={txt} size={12} color={tc.ink3}>🔍</PixelText>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submit}
              returnKeyType="search"
              inputMode="search"
              placeholder="카드 검색 (예: 리자몽)"
              placeholderTextColor={tc.ink4}
              numberOfLines={1}
              style={{
                flex: 1,
                height: 44,
                paddingHorizontal: 8,
                color: tc.ink,
                fontFamily: 'Galmuri11',
                fontSize: 12,
              }}
            />
            <Pressable onPress={submit} style={{ backgroundColor: tc.ink, paddingHorizontal: 10, paddingVertical: 8 }}>
              <PixelText variant={txt} size={8} color={tc.gold}>검색</PixelText>
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
                loading={loading}
                active={cat === 'snkrdunk'}
                onPress={() => setCat('snkrdunk')}
              />
              <CatTab
                label="번개장터"
                sub={bunjangLoaded ? `${bunjang.length}건` : '국내매물'}
                loading={bunjangLoading}
                active={cat === 'bunjang'}
                onPress={() => setCat('bunjang')}
              />
              <CatTab
                label="KREAM"
                sub={kreamLoaded ? `${kream.length}건` : 'KREAM'}
                loading={kreamLoading}
                active={cat === 'kream'}
                onPress={() => setCat('kream')}
              />
            </View>

            <View style={{ height: 12 }} />

            {/* 유의사항 배너 */}
            <PixelFrame bg={tc.red} borderWidth={3} shadow={6} hi="rgba(255,255,255,0.18)" lo="rgba(0,0,0,0.36)">
              <View style={{ padding: 14, flexDirection: 'row', gap: 12 }}>
                <Text style={{ fontSize: 24, lineHeight: 26 }}>📢</Text>
                <View style={{ flex: 1 }}>
                  <PixelText variant={txt} size={10} color={tc.gold}>
                    유의사항
                  </PixelText>
                  <PixelText variant="ko" size={11} color={tc.white} style={{ marginTop: 8, lineHeight: 18 }}>
                    SNKRDUNK는 한글 → 일본어로 번역 후 검색해요. 일본명이 다른 카드(예: 이슬이 → 카스미)는 결과가 안 나올 수 있어요. 이럴 땐 번개장터 탭에서 국내매물을 확인해 주세요.
                  </PixelText>
                  <PixelText variant="ko" size={11} color="rgba(255,255,255,0.85)" style={{ marginTop: 6, lineHeight: 18 }}>
                    결과가 0건인 카드는 현재 파악 중이며, 2~3일 내로 SNKRDUNK 검색에도 나오도록 업데이트할 예정이에요.
                  </PixelText>
                </View>
              </View>
            </PixelFrame>

            <View style={{ height: 12 }} />

            {cat === 'snkrdunk' ? (
              loading ? (
                <Spinner />
              ) : error ? (
                <EmptyState icon="!" title="검색 실패" desc={error} />
              ) : hits.length === 0 ? (
                <EmptyState icon="🔍" title="SNKRDUNK 결과가 없습니다" desc={initialQuery} />
              ) : (
                <View style={{ gap: 6 }}>
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
                <View style={{ gap: 6 }}>
                  {bunjang.map((item) => (
                    <BunjangRow key={item.pid} item={item} />
                  ))}
                  <PixelPress
                    onPress={() => Linking.openURL(bunjangSearchUrl(initialQuery))}
                    bg={tc.ink}
                    borderWidth={3}
                    shadow={5}
                    hi={null}
                    lo={null}
                    wrapStyle={{ marginTop: 2 }}
                  >
                    <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                      <PixelText variant={txt} size={9} color={tc.gold}>번개장터에서 더 보기</PixelText>
                    </View>
                  </PixelPress>
                </View>
              )
            ) : (
              <KreamPanel query={initialQuery} items={kream} loading={kreamLoading} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CatTab({
  label,
  sub,
  loading,
  active,
  onPress,
}: {
  label: string;
  sub: string;
  loading?: boolean;
  active: boolean;
  onPress: () => void;
}) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const fg = active ? tc.gold : tc.ink3;
  return (
    <View style={{ flex: 1 }}>
      <PixelPress
        onPress={onPress}
        bg={active ? tc.ink : tc.white}
        borderWidth={3}
        shadow={active ? 5 : 3}
        hi={null}
        lo={null}
        wrapStyle={{ flex: 1 }}
      >
        <View style={{ paddingVertical: 8, alignItems: 'center', gap: 3 }}>
          <PixelText variant={txt} size={9} color={active ? tc.gold : tc.ink}>
            {label}
          </PixelText>
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 12 }}>
              <ActivityIndicator size="small" color={fg} style={{ transform: [{ scale: 0.55 }] }} />
              <PixelText variant={txt} size={7} color={fg}>
                검색중
              </PixelText>
            </View>
          ) : (
            <PixelText variant={txt} size={7} color={fg}>
              {sub}
            </PixelText>
          )}
        </View>
      </PixelPress>
    </View>
  );
}

function Spinner({ pad = 40 }: { pad?: number }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={{ paddingVertical: pad, alignItems: 'center' }}>
      <ActivityIndicator color={tc.ink} />
    </View>
  );
}

function FooterNote({ text }: { text: string }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={{ paddingVertical: 16, alignItems: 'center' }}>
      <PixelText variant={txt} size={8} color={tc.ink3}>
        {text}
      </PixelText>
    </View>
  );
}

function SnkrdunkRow({ hit }: { hit: Hit }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <PixelPress
      onPress={() => router.push(`/cards/snkrdunk/${hit.apparelId}` as never)}
      bg={tc.white}
      borderWidth={3}
      shadow={5}
      hi={null}
      lo={null}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
        <View
          style={{
            width: 84,
            height: 84,
            backgroundColor: tc.ink2,
            borderColor: tc.ink,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {hit.imageUrl ? (
            <Image source={{ uri: hit.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 30 }}>🃏</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
          <PixelText variant="ko" size={12} numberOfLines={2} style={{ lineHeight: 17 }}>
            {hit.koName}
          </PixelText>
          <PixelText variant={txt} size={14} color={tc.red} numberOfLines={1} style={{ marginTop: 7 }}>
            {fmtYen(hit.minPrice)}
          </PixelText>
          <PixelText variant={txt} size={8} color={tc.ink3} numberOfLines={1} style={{ marginTop: 6 }}>
            {hit.jpName}
            {hit.listingCountText ? `   매물 ${hit.listingCountText}건` : ''}
          </PixelText>
        </View>
      </View>
    </PixelPress>
  );
}

function KreamPanel({ query, items, loading }: { query: string; items: KreamItem[]; loading: boolean }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={{ gap: 6 }}>
      {loading ? (
        <Spinner />
      ) : items.length > 0 ? (
        items.map((item) => <KreamRow key={item.id} item={item} />)
      ) : (
        <PixelFrame bg={tc.white} borderWidth={3} shadow={5}>
          <View style={{ padding: 14 }}>
            <PixelText variant="ko" size={10} color={tc.ink3} style={{ lineHeight: 16 }}>
              KREAM 결과를 불러오지 못했습니다. 아래에서 KREAM 검색을 직접 열 수 있어요.
            </PixelText>
          </View>
        </PixelFrame>
      )}
      {/* KREAM은 차단에 취약해 결과가 비어도 항상 이동 버튼 제공 */}
      <PixelPress
        onPress={() => Linking.openURL(kreamSearchUrl(query))}
        bg={tc.ink}
        borderWidth={3}
        shadow={5}
        hi={null}
        lo={null}
        wrapStyle={{ marginTop: 2 }}
      >
        <View style={{ paddingVertical: 13, alignItems: 'center' }}>
          <PixelText variant="ko" size={10} color={tc.gold}>
            KREAM에서 “{query}” 검색 →
          </PixelText>
        </View>
      </PixelPress>
    </View>
  );
}

function KreamRow({ item }: { item: KreamItem }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <PixelPress
      onPress={() => Linking.openURL(item.productUrl)}
      bg={tc.white}
      borderWidth={3}
      shadow={5}
      hi={null}
      lo={null}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
        <View
          style={{
            width: 84,
            height: 84,
            backgroundColor: tc.ink2,
            borderColor: tc.ink,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 30 }}>🃏</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
          <PixelText variant="ko" size={12} numberOfLines={2} style={{ lineHeight: 17 }}>
            {item.name}
          </PixelText>
          <PixelText variant={txt} size={14} color={tc.red} numberOfLines={1} style={{ marginTop: 7 }}>
            {item.price > 0 ? `${item.price.toLocaleString('ko-KR')}원` : '가격문의'}
          </PixelText>
          <PixelText variant={txt} size={8} color={tc.ink3} numberOfLines={1} style={{ marginTop: 6 }}>
            KREAM
          </PixelText>
        </View>
      </View>
    </PixelPress>
  );
}

function BunjangRow({ item }: { item: BunjangItem }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <PixelPress
      onPress={() => Linking.openURL(item.productUrl)}
      bg={tc.white}
      borderWidth={3}
      shadow={5}
      hi={null}
      lo={null}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
        <View
          style={{
            width: 84,
            height: 84,
            backgroundColor: tc.ink2,
            borderColor: tc.ink,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 30 }}>📦</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
          <PixelText variant="ko" size={12} numberOfLines={2} style={{ lineHeight: 17 }}>
            {item.name}
          </PixelText>
          <PixelText variant={txt} size={14} color={tc.red} numberOfLines={1} style={{ marginTop: 7 }}>
            {item.price > 0 ? `${item.price.toLocaleString('ko-KR')}원` : '가격문의'}
          </PixelText>
          <PixelText variant={txt} size={8} color={tc.ink3} numberOfLines={1} style={{ marginTop: 6 }}>
            📍 {item.location || '지역 미표기'}   ❤ {item.favCount}
          </PixelText>
        </View>
      </View>
    </PixelPress>
  );
}
