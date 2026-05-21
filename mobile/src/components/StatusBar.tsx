import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { PixelText } from './PixelText';

/**
 * Cardvault status — gold band with logo + ♥×3 + 9:41.
 */
export function StatusBar() {
  return (
    <View style={styles.bar}>
      <PixelText variant="pixel" size={9} color={colors.ink} style={{ letterSpacing: 1 }}>
        🃏 CARDVAULT
      </PixelText>
      <PixelText variant="pixel" size={9} color={colors.ink} style={{ letterSpacing: 1 }}>
        ♥×3   9:41
      </PixelText>
      <View pointerEvents="none" style={styles.hi} />
      <View pointerEvents="none" style={styles.lo} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 30,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gold,
    borderBottomWidth: 3,
    borderBottomColor: colors.ink,
  },
  hi: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.goldLt,
  },
  lo: {
    position: 'absolute',
    bottom: 3,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.goldDk,
  },
});
