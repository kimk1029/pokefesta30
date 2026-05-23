import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCurrency } from './CurrencyProvider';
import { colors, fonts } from '@/theme/tokens';

/** 마이페이지 설정 — 통화 행 (¥ ↔ ₩ 토글). */
export function CurrencySettingsItem() {
  const { mode, toggle, rate } = useCurrency();
  const isKrw = mode === 'krw';

  return (
    <Pressable onPress={toggle} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: isKrw ? colors.blu : colors.red }]}>
        <Text style={styles.iconText}>{isKrw ? '₩' : '¥'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>
          통화 <Text style={styles.sub}>· {isKrw ? '원화 (KRW)' : '엔화 (JPY)'}</Text>
        </Text>
        {isKrw && <Text style={styles.rate}>1¥ ≈ {rate.toFixed(2)}₩</Text>}
      </View>
      <Text style={styles.arrow}>↔</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: colors.ink,
    shadowOpacity: 1,
    shadowOffset: { width: 3, height: 3 },
    shadowRadius: 0,
    elevation: 2,
  },
  icon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: colors.white, fontFamily: fonts.pixel, fontSize: 16 },
  label: { fontFamily: fonts.pixel, fontSize: 11, color: colors.ink, letterSpacing: 0.3 },
  sub: { color: colors.ink3, fontSize: 9 },
  rate: { color: colors.ink3, fontFamily: fonts.pixel, fontSize: 8, marginTop: 3, letterSpacing: 0.3 },
  arrow: { color: colors.ink3, fontFamily: fonts.pixel, fontSize: 14 },
});
