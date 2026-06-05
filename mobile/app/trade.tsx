import { ScrollView, View, StyleSheet } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { colors, space } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import { TRADES } from '@/lib/data';

export default function Trade() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={{ flex: 1 }}>
      <AppBar title="거래" />
      <ScrollView
        contentContainerStyle={{ paddingTop: space.gap, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {TRADES.map((t) => (
          <View key={t.id} style={styles.card}>
            <View style={styles.head}>
              <View
                style={[
                  styles.tag,
                  { backgroundColor: t.type === 'sell' ? tc.red : tc.blu },
                ]}
              >
                <PixelText variant={txt} size={9} color={tc.white}>
                  {t.type === 'sell' ? '팔아요' : '구해요'}
                </PixelText>
              </View>
              <PixelText variant={txt} size={11} color={tc.ink}>
                {t.price}
              </PixelText>
            </View>
            <PixelText
              variant="ko"
              size={13}
              color={tc.ink}
              style={{ marginTop: 8, lineHeight: 19 }}
            >
              {t.title}
            </PixelText>
            <PixelText
              variant={txt}
              size={9}
              color={tc.ink3}
              style={{ marginTop: 8 }}
            >
              {t.place} · {t.time}
            </PixelText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    padding: 14,
    marginHorizontal: space.gap,
    marginBottom: space.cg,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
