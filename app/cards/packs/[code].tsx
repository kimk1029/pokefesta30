/**
 * /cards/packs/[code] — 팩별 힛카드 풀 그리드.
 * GET /api/card-packs/[code]?limit=30 호출.
 */
import { ScrollView, View, Pressable, Image, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelPress } from '@/components/cv/PixelPress';
import { EmptyState, ErrorView, LoadingState } from '@/components/cv/ListState';
import { colors } from '@/theme/tokens';
import { fetchPackHits, type PackWithHits } from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';

export default function PackDetailScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = params.code ?? '';
  const { data, loading, error, refresh } = useAsync<PackWithHits | null>(
    () => fetchPackHits(code, 30),
    [code],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
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
          {/* Pack header */}
          <View style={{ marginHorizontal: 14, marginTop: 14, marginBottom: 14 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                backgroundColor: data.bg,
                borderColor: colors.ink,
                borderWidth: 3,
              }}
            >
              <Text style={{ fontSize: 38 }}>{data.emoji}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <PixelText variant="pixel" size={13} color={colors.white} style={{ letterSpacing: 0.5 }} numberOfLines={2}>
                  {data.name}
                </PixelText>
                <PixelText variant="pixel" size={9} color={colors.white} style={{ marginTop: 6, opacity: 0.85 }}>
                  {data.releasedAt ? `${data.releasedAt} 출시 · ` : ''}{data.hits.length}장
                </PixelText>
              </View>
            </View>
          </View>

          {/* Grid */}
          <View style={{ marginHorizontal: 14 }}>
            {data.hits.length === 0 ? (
              <EmptyState icon="📭" title="매물 정보를 가져오지 못했어요" ctaLabel="다시 시도" onCtaPress={refresh} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {sortByPrice(data.hits).map((hit) => (
                  <View key={hit.apparelId} style={{ width: '31%' }}>
                    <PixelPress
                      onPress={() => router.push(`/cards/snkrdunk/${hit.apparelId}` as never)}
                      innerStyle={{ borderTopWidth: 4, borderTopColor: data.bg }}
                    >
                      <View>
                        <View
                          style={{
                            height: 120,
                            backgroundColor: colors.pap2,
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
                        <View style={{ padding: 8, borderTopColor: colors.ink, borderTopWidth: 3 }}>
                          <PixelText variant="pixel" size={8} numberOfLines={1} style={{ marginBottom: 5 }}>
                            {hit.shortName}
                          </PixelText>
                          <PixelText variant="pixel" size={10} color={colors.red} numberOfLines={1}>
                            {hit.minPrice > 0 ? `¥${hit.minPrice.toLocaleString('ja-JP')}` : '시세 없음'}
                          </PixelText>
                          <PixelText variant="pixel" size={8} color={colors.ink3} numberOfLines={1} style={{ marginTop: 3 }}>
                            {hit.listingCountText ? `매물 ${hit.listingCountText}건` : '매물 없음'}
                          </PixelText>
                        </View>
                      </View>
                    </PixelPress>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function sortByPrice<T extends { minPrice: number }>(hits: T[]): T[] {
  return [...hits].sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
}
