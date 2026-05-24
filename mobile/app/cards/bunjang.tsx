import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { bunjangSearchUrl, fetchBunjangItems, type BunjangItem } from '@/services/marketplace';

const DEFAULT_QUERY = '포켓몬카드';

export default function BunjangScreen() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [submitted, setSubmitted] = useState(DEFAULT_QUERY);
  const [items, setItems] = useState<BunjangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await fetchBunjangItems(q, 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(submitted);
  }, [load, submitted]);

  const header = useMemo(
    () => (
      <View style={{ gap: 12, marginBottom: 2 }}>
        <PixelFrame bg={colors.red} borderWidth={3} shadow={6} hi="rgba(255,255,255,0.18)" lo="rgba(0,0,0,0.36)">
          <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 30 }}>🇰🇷</Text>
            <View style={{ flex: 1 }}>
              <PixelText variant="pixel" size={11} color={colors.gold}>
                국내마켓
              </PixelText>
              <PixelText variant="ko" size={10} color={colors.white} style={{ marginTop: 6, lineHeight: 15 }}>
                번개장터 국내 매물을 실시간으로 확인합니다.
              </PixelText>
            </View>
          </View>
        </PixelFrame>

        <PixelFrame bg={colors.white} borderWidth={3} shadow={5}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
            <PixelText variant="pixel" size={12} color={colors.ink3}>
              🔍
            </PixelText>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => setSubmitted(query.trim() || DEFAULT_QUERY)}
              returnKeyType="search"
              placeholder="검색어"
              placeholderTextColor={colors.ink4}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 8,
                color: colors.ink,
                fontFamily: 'Galmuri11',
                fontSize: 14,
              }}
            />
            <Pressable onPress={() => setSubmitted(query.trim() || DEFAULT_QUERY)}>
              <View style={{ backgroundColor: colors.ink, paddingHorizontal: 9, paddingVertical: 7, borderColor: colors.ink, borderWidth: 1 }}>
                <PixelText variant="pixel" size={8} color={colors.gold}>
                  검색
                </PixelText>
              </View>
            </Pressable>
          </View>
        </PixelFrame>
      </View>
    ),
    [query],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title="국내마켓" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.pid}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 110, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(submitted, true)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={{ paddingVertical: 28, alignItems: 'center' }}>
            {loading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <PixelText variant="ko" size={12} color={colors.ink3}>
                {error ? `불러오기 오류: ${error}` : '검색 결과가 없습니다.'}
              </PixelText>
            )}
          </View>
        }
        ListFooterComponent={
          items.length > 0 ? (
            <PixelPress onPress={() => Linking.openURL(bunjangSearchUrl(submitted))} bg={colors.ink} borderWidth={3} shadow={5}>
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <PixelText variant="pixel" size={9} color={colors.gold}>
                  번개장터에서 더 보기
                </PixelText>
              </View>
            </PixelPress>
          ) : null
        }
        renderItem={({ item }) => <MarketRow item={item} />}
      />
    </View>
  );
}

function MarketRow({ item }: { item: BunjangItem }) {
  return (
    <PixelPress onPress={() => Linking.openURL(item.productUrl)} bg={colors.white} borderWidth={3} shadow={5} hi={null} lo={null}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
        <View
          style={{
            width: 72,
            height: 72,
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
            <Text style={{ fontSize: 24 }}>🃏</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PixelText variant="ko" size={12} weight="bold" numberOfLines={2} style={{ lineHeight: 16 }}>
            {item.name}
          </PixelText>
          <PixelText variant="pixel" size={8} color={colors.ink3} numberOfLines={1} style={{ marginTop: 5 }}>
            {item.location || '지역 미표기'} · 찜 {item.favCount}
          </PixelText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <PixelText variant="pixel" size={10} color={colors.red} numberOfLines={1}>
            {item.price > 0 ? `₩${item.price.toLocaleString('ko-KR')}` : '가격문의'}
          </PixelText>
          <PixelText variant="pixel" size={11} color={colors.ink3}>
            ›
          </PixelText>
        </View>
      </View>
    </PixelPress>
  );
}
