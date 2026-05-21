import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { PixelText } from '../PixelText';

interface Props {
  g: number | null;
  size?: number;
}

/** PSA grade square badge. */
export function GradeBadge({ g, size = 36 }: Props) {
  if (!g) return null;
  const bg =
    g >= 10 ? colors.psa10 : g >= 9 ? colors.psa9 : g >= 8 ? colors.psa8 : colors.psa7;
  const fg = g >= 8 && g < 9 ? colors.white : colors.ink;
  const shadow = 3;
  return (
    <View style={[styles.wrap, { width: size + shadow, height: size + shadow }]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: colors.ink,
            top: shadow,
            left: shadow,
            right: 0,
            bottom: 0,
            width: size,
            height: size,
          },
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: bg,
          borderWidth: 3,
          borderColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PixelText variant="pixel" size={Math.round(size * 0.36)} color={fg}>
          {String(g)}
        </PixelText>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: 'rgba(255,255,255,0.4)',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
