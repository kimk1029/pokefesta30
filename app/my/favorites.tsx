/**
 * /my/favorites — 관심카드 목록.
 *
 * 로컬 컬렉션에서 `favorite === true` 인 항목만 추출.
 * 포트폴리오 가치 합계에는 포함되지 않음 (홈 dashboardScreen 에서 필터).
 * 각 항목 탭 시 시세 상세로 이동.
 */
import { ScrollView, View, Image, Text, Pressable, ToastAndroid, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { EmptyState } from '@/components/cv/ListState';
import { colors } from '@/theme/tokens';
import { useCollection, removeCard } from '@/lib/collection';

function toast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('알림', msg);
  }
}

export default function FavoritesScreen() {
  const owned = useCollection();
  const favs = owned.filter((c) => c.favorite === true);
  const totalEstimated = favs.reduce((s, c) => s + (c.price ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar title="관심 카드" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {favs.length === 0 ? (
          <View style={{ marginHorizontal: 14, marginTop: 30 }}>
            <EmptyState
              icon="⭐"
              title="관심 카드가 없어요"
              desc="시세 상세 페이지의 [관심카드] 버튼을 눌러 추가하세요."
              ctaLabel="가격 탐색"
              onCtaPress={() => router.push('/cards/packs' as never)}
            />
          </View>
        ) : (
          <>
            {/* 요약 — 관심카드는 포트폴리오 합계에 포함되지 않음을 명시 */}
            <View style={{ marginHorizontal: 14, marginTop: 14, marginBottom: 12 }}>
              <PixelFrame bg={colors.ink2}>
                <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Text style={{ fontSize: 36 }}>⭐</Text>
                  <View style={{ flex: 1 }}>
                    <PixelText variant="ko" size={13} weight="bold" color={colors.white}>
                      관심 카드 {favs.length}장
                    </PixelText>
                    <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.65)" style={{ marginTop: 6, lineHeight: 14 }}>
                      예상 시세 합계 ¥{totalEstimated.toLocaleString('ja-JP')}
                    </PixelText>
                    <PixelText variant="ko" size={9} color={colors.gold} style={{ marginTop: 4, opacity: 0.85 }}>
                      ※ 포트폴리오 가치에는 포함되지 않습니다
                    </PixelText>
                  </View>
                </View>
              </PixelFrame>
            </View>

            {/* 카드 리스트 */}
            <View style={{ marginHorizontal: 14, gap: 10 }}>
              {favs.map((c) => (
                <PixelPress
                  key={c.id}
                  onPress={() => {
                    if (c.snkrdunkApparelId) {
                      router.push(`/cards/snkrdunk/${c.snkrdunkApparelId}` as never);
                    }
                  }}
                  bg={colors.white}
                  borderWidth={3}
                  shadow={5}
                  hi="rgba(255,255,255,0.95)"
                  lo="rgba(0,0,0,0.22)"
                  inner={0}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 }}>
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        backgroundColor: colors.pap2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderColor: colors.ink,
                        borderWidth: 2,
                        overflow: 'hidden',
                      }}
                    >
                      {c.imageUrl ? (
                        <Image source={{ uri: c.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 26 }}>{c.emoji || '🃏'}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <PixelText variant="ko" size={12} weight="bold" color={colors.ink} numberOfLines={2}>
                        {c.name}
                      </PixelText>
                      <PixelText variant="pixel" size={9} color={colors.red} style={{ marginTop: 4, letterSpacing: 0.3 }}>
                        ¥{c.price.toLocaleString('ja-JP')}
                      </PixelText>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        removeCard(c.id);
                        toast('관심 카드에서 제거되었습니다');
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: colors.ink3,
                        borderColor: colors.ink,
                        borderWidth: 1,
                      }}
                    >
                      <PixelText variant="pixel" size={9} color={colors.white}>
                        해제
                      </PixelText>
                    </Pressable>
                  </View>
                </PixelPress>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
