import { ScrollView, View, StyleSheet, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelButton } from '@/components/PixelButton';
import { SectTitle } from '@/components/SectTitle';
import { colors, space } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import { ORIPA_BOXES, ORIPA_RESULTS } from '@/lib/data';
import type { OripaTier } from '@/lib/types';

const TIER_BG: Record<OripaTier, string> = {
  normal: colors.teal,
  rare: colors.blu,
  legend: colors.pur,
};

const TIER_LABEL: Record<OripaTier, string> = {
  normal: '노멀',
  rare: '레어',
  legend: '레전드',
};

export default function Oripa() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={{ flex: 1 }}>
      <AppBar title="오리파" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.banner}>
          <PixelText variant={txt} size={11} color={tc.yel}>
            랜덤 박스에서 한정 보상을!
          </PixelText>
          <PixelText
            variant={txt}
            size={8}
            color={tc.white}
            style={{ marginTop: 6, lineHeight: 14 }}
          >
            오늘만 보너스 +20% / 소진 시 자동 마감
          </PixelText>
        </View>

        <SectTitle title="박스 라인업" />
        <View style={{ paddingHorizontal: space.gap, gap: space.cg }}>
          {ORIPA_BOXES.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/oripa/${b.id}` as never)}
            >
              <View style={[styles.box, { backgroundColor: TIER_BG[b.tier] }]}>
                <View style={styles.boxTop}>
                  <View style={styles.tierTag}>
                    <PixelText variant={txt} size={9} color={tc.ink}>
                      {TIER_LABEL[b.tier]}
                    </PixelText>
                  </View>
                  <Text style={styles.boxEmoji}>{b.emoji}</Text>
                </View>
                <PixelText
                  variant={txt}
                  size={13}
                  color={tc.white}
                  style={{ marginTop: 10 }}
                >
                  {b.name}
                </PixelText>
                <PixelText
                  variant={txt}
                  size={8}
                  color="rgba(255,255,255,0.85)"
                  style={{ marginTop: 6, lineHeight: 14 }}
                >
                  {b.desc}
                </PixelText>
                <PixelText
                  variant={txt}
                  size={8}
                  color={tc.yelLt}
                  style={{ marginTop: 8 }}
                >
                  {b.odds}
                </PixelText>
                <View style={styles.boxBottom}>
                  <PixelText variant={txt} size={11} color={tc.yel}>
                    {b.price}P
                  </PixelText>
                  <View style={styles.openBtn}>
                    <PixelText variant={txt} size={9} color={tc.ink}>
                      열기 ▶
                    </PixelText>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 18 }} />
        <SectTitle title="실시간 당첨" more="더보기 >" />
        <View style={{ paddingHorizontal: space.gap, gap: 8 }}>
          {ORIPA_RESULTS.map((r) => (
            <View key={r.id} style={styles.result}>
              <View style={styles.avatar}>
                <Text style={{ fontSize: 18 }}>{r.user}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <PixelText variant={txt} size={10} color={tc.ink}>
                  {r.box} 박스 · {r.reward}
                </PixelText>
                <PixelText
                  variant={txt}
                  size={8}
                  color={tc.ink3}
                  style={{ marginTop: 4 }}
                >
                  {r.time}
                </PixelText>
              </View>
              <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    margin: space.gap,
    backgroundColor: colors.ink,
    padding: 16,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  box: {
    padding: 14,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  boxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierTag: {
    backgroundColor: colors.yel,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  boxEmoji: { fontSize: 32 },
  boxBottom: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openBtn: {
    backgroundColor: colors.yel,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 10,
    borderWidth: 3,
    borderColor: colors.ink,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.pap2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
