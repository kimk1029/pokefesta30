/**
 * 카드 검색 전광판 — 인기 검색어 1~10위를 흘려보낸다 (웹 TranslationTicker 패리티).
 * GET /api/search-log/top (최근 30일 Top 10). 비면 안내 문구 폴백.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { PixelText } from '@/components/PixelText';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import { api } from '@/lib/apiClient';

export interface SearchRankItem {
  query: string;
  count: number;
}

export function TranslationTicker() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const [ranks, setRanks] = useState<SearchRankItem[]>([]);
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;
    api<{ items: SearchRankItem[] }>('/api/search-log/top', { auth: false })
      .then((r) => alive && setRanks((r.items ?? []).slice(0, 10)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (w <= 0) return;
    x.setValue(0);
    const anim = Animated.loop(
      Animated.timing(x, { toValue: -w, duration: Math.max(8000, Math.round(w * 30)), easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [w, ranks, x]);

  const List = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} onLayout={ranks.length > 0 || w === 0 ? (e) => setW(e.nativeEvent.layout.width) : undefined}>
      {ranks.length > 0 ? (
        ranks.map((r, i) => (
          <View key={`${r.query}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}>
            <PixelText variant={txt} size={10} weight="bold" color={i < 3 ? tc.gold : 'rgba(255,255,255,0.55)'}>
              {i + 1}
            </PixelText>
            <PixelText variant="ko" size={10} color={tc.white} style={{ marginLeft: 5 }}>
              {r.query}
            </PixelText>
          </View>
        ))
      ) : (
        <PixelText variant="ko" size={10} color="rgba(255,255,255,0.6)" style={{ marginRight: 18 }}>
          아직 집계된 검색어가 없어요 — 카드를 검색해보세요
        </PixelText>
      )}
    </View>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: tc.ink, paddingVertical: 8, paddingHorizontal: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <PixelText variant={txt} size={8} color={tc.red}>●</PixelText>
        <PixelText variant={txt} size={9} color={tc.gold} style={{ letterSpacing: 0.5 }}>
          인기 검색어
        </PixelText>
      </View>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
          <List />
          <List />
        </Animated.View>
      </View>
    </View>
  );
}
