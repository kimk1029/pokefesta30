/**
 * /cards/packs/[code] — 팩별 힛카드 풀 그리드 + 리스트 뷰 전환.
 */
import { useMemo, useState } from 'react';
import { ScrollView, View, Pressable, Image, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelPress } from '@/components/cv/PixelPress';
import { EmptyState, ErrorView, LoadingState } from '@/components/cv/ListState';
import { colors } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import { fetchPackHits, type PackHitCard, type PackWithHits } from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';
import { useCurrency } from '@/components/CurrencyProvider';

type SortMode = 'price' | 'recent' | 'listing' | 'name';
type ViewMode = 'grid' | 'list';

export default function PackDetailScreen() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const { format: formatCurrency } = useCurrency();
  const params = useLocalSearchParams<{ code: string }>();
  const code = params.code ?? '';
  const [sort, setSort] = useState<SortMode>('price');
  const [view, setView] = useState<ViewMode>('grid');
  const { data, loading, error, refresh } = useAsync<PackWithHits | null>(
    () => fetchPackHits(code, 200),
    [code],
  );
  // 웹 packs/[code]/page.tsx 동일 — itemKind 로 싱글/박스 분리.
  const singles = useMemo(() => (data?.hits ?? []).filter((h) => h.itemKind !== 'box'), [data?.hits]);
  const boxes = useMemo(() => (data?.hits ?? []).filter((h) => h.itemKind === 'box'), [data?.hits]);
  const cards = useMemo(() => sortHits(singles, sort), [singles, sort]);
  const sortedBoxes = useMemo(() => sortHits(boxes, 'price'), [boxes]);

  return (
    <View style={{ flex: 1, backgroundColor: tc.paper }}>
      <AppBar onBack={() => router.back()} title={data?.shortName ?? '카드팩'} />
      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <View style={{ margin: 14 }}>
          <ErrorView error={error} onRetry={refresh} />
        </View>
      ) : !data ? (
        <View style={{ margin: 14 }}>
          <EmptyState icon="📦" title="팩을 찾지 못했어요" desc={`code=${code}`} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
          {/* Pack header — 박스 이미지 + 정보 */}
          <View style={{ marginHorizontal: 14, marginTop: 14, marginBottom: 14 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'stretch',
                gap: 12,
                padding: 12,
                backgroundColor: data.bg,
                borderColor: tc.ink,
                borderWidth: 3,
              }}
            >
              {/* 박스 대표 이미지 */}
              <View
                style={{
                  width: 110,
                  height: 110,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.18)',
                  borderColor: tc.ink,
                  borderWidth: 2,
                  overflow: 'hidden',
                }}
              >
                {data.boxImageUrl ? (
                  <Image
                    source={{ uri: data.boxImageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 48 }}>{data.emoji}</Text>
                )}
              </View>
              {/* 정보 */}
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between', paddingVertical: 2 }}>
                <View>
                  <PixelText
                    variant="ko"
                    size={13}
                    weight="bold"
                    color={tc.white}
                    style={{ letterSpacing: 0.5 }}
                    numberOfLines={2}
                  >
                    {data.name}
                  </PixelText>
                  {data.boxKoName ? (
                    <PixelText
                      variant="ko"
                      size={10}
                      color={tc.white}
                      style={{ marginTop: 4, opacity: 0.85, lineHeight: 14 }}
                      numberOfLines={2}
                    >
                      {data.boxKoName}
                    </PixelText>
                  ) : null}
                </View>
                <View style={{ gap: 4 }}>
                  {data.releasedAt ? (
                    <PixelText variant={txt} size={8} color={tc.white} style={{ opacity: 0.85, letterSpacing: 0.3 }} numberOfLines={1}>
                      📅 {data.releasedAt} 출시
                    </PixelText>
                  ) : null}
                  <PixelText variant={txt} size={8} color={tc.white} style={{ opacity: 0.85, letterSpacing: 0.3 }} numberOfLines={1}>
                    🎴 가격 있는 카드 {data.hits.length}장
                  </PixelText>
                </View>
              </View>
            </View>
          </View>

          {/* Sort + view toggle */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
              marginLeft: 14,
              marginRight: 18,
              marginBottom: 14,
              alignItems: 'center',
            }}
          >
            {([
              ['price', '가격 높은순'],
              ['recent', '최근 거래순'],
              ['listing', '매물 많은순'],
              ['name', '이름순'],
            ] as const).map(([key, label]) => {
              const on = sort === key;
              return (
                <PixelPress
                  key={key}
                  onPress={() => setSort(key)}
                  bg={on ? tc.ink : tc.white}
                  borderWidth={3}
                  shadow={4}
                  hi={on ? null : 'rgba(255,255,255,0.95)'}
                  lo={on ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.32)'}
                  inner={3}
                >
                  <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                    <PixelText variant={txt} size={9} color={on ? tc.gold : tc.ink}>
                      {label}
                    </PixelText>
                  </View>
                </PixelPress>
              );
            })}

            <View style={{ flex: 1 }} />

            {([
              ['grid', '⊞'],
              ['list', '☰'],
            ] as const).map(([key, icon]) => {
              const on = view === key;
              return (
                <PixelPress
                  key={key}
                  onPress={() => setView(key)}
                  bg={on ? tc.ink : tc.white}
                  borderWidth={3}
                  shadow={4}
                  hi={on ? null : 'rgba(255,255,255,0.95)'}
                  lo={on ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.32)'}
                  inner={3}
                >
                  <View style={{ paddingHorizontal: 9, paddingVertical: 6 }}>
                    <PixelText variant={txt} size={14} color={on ? tc.gold : tc.ink}>
                      {icon}
                    </PixelText>
                  </View>
                </PixelPress>
              );
            })}
          </View>

          {/* Body */}
          <View style={{ marginHorizontal: 14 }}>
            {data.hits.length === 0 ? (
              <EmptyState icon="📭" title="매물 정보를 가져오지 못했어요" ctaLabel="다시 시도" onCtaPress={refresh} />
            ) : view === 'grid' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {cards.map((hit) => (
                  <View key={hit.apparelId} style={{ width: '32%' }}>
                    <PixelPress
                      onPress={() => router.push(`/cards/snkrdunk/${hit.apparelId}` as never)}
                      innerStyle={{ borderTopWidth: 4, borderTopColor: data.bg }}
                    >
                      <View>
                        <View
                          style={{
                            height: 120,
                            backgroundColor: tc.pap2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {hit.imageUrl ? (
                            <Image source={{ uri: hit.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" resizeMethod="resize" />
                          ) : (
                            <Text style={{ fontSize: 30 }}>🃏</Text>
                          )}
                        </View>
                        <View style={{ padding: 5, borderTopColor: tc.ink, borderTopWidth: 3 }}>
                          <PixelText variant="ko" size={11} weight="bold" numberOfLines={2} style={{ minHeight: 30, lineHeight: 15 }}>
                            {hit.koName || hit.shortName}
                          </PixelText>
                          <PixelText variant={txt} size={7} color={tc.ink3} numberOfLines={1} style={{ marginTop: 2 }}>
                            {hit.name}
                          </PixelText>
                          <PixelText variant={txt} size={10} color={tc.red} numberOfLines={1} style={{ marginTop: 6 }}>
                            {hit.minPrice > 0 ? formatCurrency(hit.minPrice) : '시세 없음'}
                          </PixelText>
                          <PixelText variant={txt} size={8} color={tc.ink3} numberOfLines={1} style={{ marginTop: 3 }}>
                            {hit.listingCountText ? `매물 ${hit.listingCountText}건` : '매물 없음'}
                          </PixelText>
                        </View>
                      </View>
                    </PixelPress>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {cards.map((hit) => (
                  <ListRow key={hit.apparelId} hit={hit} accent={data.bg} />
                ))}
              </View>
            )}

            {/* 박스/팩 섹션 — 웹 PackMarketSections 동일(가격순 고정) */}
            {sortedBoxes.length > 0 ? (
              <View style={{ marginTop: 18 }}>
                <PixelText variant="ko" size={13} weight="bold" color={tc.ink} style={{ marginBottom: 8 }}>
                  📦 박스 · 팩 {sortedBoxes.length}
                </PixelText>
                <View style={{ gap: 8 }}>
                  {sortedBoxes.map((hit) => (
                    <ListRow key={hit.apparelId} hit={hit} accent={data.bg} />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ListRow({ hit, accent }: { hit: PackHitCard; accent: string }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const { format: formatCurrency } = useCurrency();
  return (
    <PixelPress
      onPress={() => router.push(`/cards/snkrdunk/${hit.apparelId}` as never)}
      innerStyle={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      <View style={{ flexDirection: 'row', gap: 12, padding: 10, alignItems: 'center' }}>
        <View
          style={{
            width: 64,
            height: 88,
            backgroundColor: tc.pap2,
            borderColor: tc.ink,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {hit.imageUrl ? (
            <Image source={{ uri: hit.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" resizeMethod="resize" />
          ) : (
            <Text style={{ fontSize: 24 }}>🃏</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PixelText variant="ko" size={12} weight="bold" numberOfLines={2}>
            {hit.koName || hit.shortName}
          </PixelText>
          <PixelText variant={txt} size={8} color={tc.ink3} numberOfLines={1} style={{ marginTop: 3 }}>
            {hit.name}
          </PixelText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <PixelText variant={txt} size={11} color={tc.red}>
              {hit.minPrice > 0 ? formatCurrency(hit.minPrice) : '시세 없음'}
            </PixelText>
            <PixelText variant={txt} size={8} color={tc.ink3}>
              {hit.listingCountText ? `매물 ${hit.listingCountText}건` : '매물 없음'}
            </PixelText>
          </View>
        </View>
        <PixelText variant={txt} size={14} color={tc.ink3}>›</PixelText>
      </View>
    </PixelPress>
  );
}

function sortHits<T extends { minPrice: number; listingCount: number; koName?: string; shortName: string; lastSaleSort?: number }>(
  hits: T[],
  sort: SortMode,
): T[] {
  if (sort === 'recent') return [...hits].sort((a, b) => (b.lastSaleSort ?? 0) - (a.lastSaleSort ?? 0) || (b.minPrice || 0) - (a.minPrice || 0));
  if (sort === 'listing') return [...hits].sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0));
  if (sort === 'name') return [...hits].sort((a, b) => (a.koName || a.shortName).localeCompare(b.koName || b.shortName, 'ko'));
  return [...hits].sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
}
