import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { fetchMvcAuctions, type MvcAuctionItem } from '@/services/marketplace';

export default function MvcAuctionScreen() {
  const [items, setItems] = useState<MvcAuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await fetchMvcAuctions(1));
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title="MVC 경매" />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.articleId)}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 110, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListHeaderComponent={<Header />}
        ListEmptyComponent={
          <View style={{ paddingVertical: 28, alignItems: 'center' }}>
            {loading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <PixelText variant="ko" size={12} color={colors.ink3}>
                {error ? `불러오기 오류: ${error}` : '오늘 마감 경매가 없습니다.'}
              </PixelText>
            )}
          </View>
        }
        renderItem={({ item }) => <AuctionRow item={item} />}
      />
    </View>
  );
}

function Header() {
  return (
    <View style={{ marginBottom: 4 }}>
      <PixelFrame bg={colors.ink2} borderWidth={3} shadow={6} hi="rgba(255,255,255,0.12)" lo="rgba(0,0,0,0.5)">
        <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 30 }}>🔨</Text>
          <View style={{ flex: 1 }}>
            <PixelText variant="pixel" size={11} color={colors.gold}>
              오늘 마감 경매
            </PixelText>
            <PixelText variant="ko" size={10} color={colors.white} style={{ marginTop: 6, lineHeight: 15 }}>
              포켓몬카드 MVC 경매 게시판 기준입니다.
            </PixelText>
          </View>
        </View>
      </PixelFrame>
    </View>
  );
}

function AuctionRow({ item }: { item: MvcAuctionItem }) {
  return (
    <PixelPress onPress={() => Linking.openURL(item.sourceUrl)} bg={colors.white} borderWidth={3} shadow={5} hi={null} lo={null}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
        <View
          style={{
            width: 64,
            height: 64,
            backgroundColor: colors.pap2,
            borderColor: colors.ink,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 24 }}>🃏</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PixelText variant="ko" size={12} weight="bold" numberOfLines={2} style={{ lineHeight: 16 }}>
            {item.subject}
          </PixelText>
          <PixelText variant="pixel" size={8} color={colors.ink3} numberOfLines={1} style={{ marginTop: 5 }}>
            댓글 {item.commentCount} · 조회 {item.readCount} · {item.writtenAgo}
          </PixelText>
          <PixelText variant="ko" size={9} color={colors.ink3} numberOfLines={1} style={{ marginTop: 4 }}>
            {item.writerNickname}
          </PixelText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <View style={{ backgroundColor: colors.gold, borderColor: colors.ink, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 4 }}>
            <PixelText variant="pixel" size={8} color={colors.ink}>
              {item.costText || '경매'}
            </PixelText>
          </View>
          <PixelText variant="pixel" size={11} color={colors.ink3}>
            ›
          </PixelText>
        </View>
      </View>
    </PixelPress>
  );
}
