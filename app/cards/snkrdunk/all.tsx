import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, Text, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import {
  fetchSnkrdunkBrowse,
  type SnkrdunkSearchResult,
} from '@/services/snkrdunk';

function shortenName(name: string): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > 32 ? cut.slice(0, 31) + '…' : cut;
}

export default function SnkrdunkAll() {
  const [items, setItems] = useState<SnkrdunkSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenRef = useRef<Set<number>>(new Set());

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchSnkrdunkBrowse(p);
      const fresh = results.filter((r) => !seenRef.current.has(r.apparelId));
      fresh.forEach((r) => seenRef.current.add(r.apparelId));
      if (fresh.length === 0) {
        setDone(true);
      } else {
        setItems((prev) => [...prev, ...fresh]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const onEndReached = useCallback(() => {
    if (loading || done) return;
    const next = page + 1;
    setPage(next);
    loadPage(next);
  }, [loading, done, page, loadPage]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title="스니다 전체 시세" />
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.apparelId)}
        contentContainerStyle={{ padding: 14, paddingBottom: 100, gap: 8 }}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            {error ? (
              <Pressable onPress={() => loadPage(page)}>
                <PixelText variant="pixel" size={9} color={colors.red}>
                  불러오기 오류: {error} · 재시도
                </PixelText>
              </Pressable>
            ) : loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ActivityIndicator size="small" color={colors.ink3} />
                <PixelText variant="pixel" size={9} color={colors.ink3}>
                  불러오는 중…
                </PixelText>
              </View>
            ) : done ? (
              <PixelText variant="pixel" size={9} color={colors.ink3}>
                {items.length === 0 ? '결과가 없습니다.' : '— 끝 —'}
              </PixelText>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <PixelPress
            onPress={() => router.push(`/cards/snkrdunk/${item.apparelId}` as never)}
          >
            <PixelFrame bg={colors.white}>
              <View style={{ flexDirection: 'row', padding: 10, gap: 12 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: colors.pap2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderColor: colors.ink,
                    borderWidth: 2,
                  }}
                >
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ fontSize: 24 }}>🃏</Text>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                  <PixelText
                    variant="pixel"
                    size={10}
                    numberOfLines={2}
                    style={{ lineHeight: 14, marginBottom: 6 }}
                  >
                    {shortenName(item.name)}
                  </PixelText>
                  <PixelText variant="pixel" size={11} color={colors.red} numberOfLines={1}>
                    {item.priceText || '—'}
                  </PixelText>
                </View>
              </View>
            </PixelFrame>
          </PixelPress>
        )}
      />
    </View>
  );
}
