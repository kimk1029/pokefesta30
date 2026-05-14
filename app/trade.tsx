import { ScrollView, View, StyleSheet } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { colors, space } from '@/theme/tokens';
import { TRADES } from '@/lib/data';

export default function Trade() {
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
                  { backgroundColor: t.type === 'sell' ? colors.red : colors.blu },
                ]}
              >
                <PixelText variant="pixel" size={9} color={colors.white}>
                  {t.type === 'sell' ? '팔아요' : '구해요'}
                </PixelText>
              </View>
              <PixelText variant="pixel" size={11} color={colors.ink}>
                {t.price}
              </PixelText>
            </View>
            <PixelText
              variant="ko"
              size={13}
              color={colors.ink}
              style={{ marginTop: 8, lineHeight: 19 }}
            >
              {t.title}
            </PixelText>
            <PixelText
              variant="pixel"
              size={9}
              color={colors.ink3}
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
