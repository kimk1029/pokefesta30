import { View, type ViewProps, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { useThemeColors, useTheme } from '../ThemeProvider';

interface Props extends ViewProps {
  bg?: string;
  border?: string;
  borderWidth?: number;
  shadow?: number;
  hi?: string | null;
  lo?: string | null;
  inner?: number;
}

/**
 * 4-sided pixel bevel:
 *   • top + left bright highlight (raised edge)
 *   • bottom + right dark step (drop face)
 *   • deeper offset hard shadow under everything (ground)
 * The face sits "on top" of the shadow with a noticeable depth.
 */
export function PixelFrame({
  bg = colors.white,
  border = colors.ink,
  borderWidth = 4,
  shadow = 8,
  hi = 'rgba(255,255,255,0.95)',
  lo = 'rgba(0,0,0,0.32)',
  inner = 5,
  style,
  children,
  ...rest
}: Props) {
  const c = useThemeColors();
  const { theme } = useTheme();
  const faceBg = bg === colors.white ? c.white : bg;
  const edge = border === colors.ink ? c.ink : border;
  const midShadow = theme === 'onepiece'
    ? 'rgba(122,74,26,0.62)'
    : theme === 'yugioh'
      ? 'rgba(184,134,11,0.68)'
      : theme === 'sports'
        ? 'rgba(20,83,45,0.58)'
        : 'rgba(15,23,42,0.55)';
  const drop = Math.max(2, shadow - 2);
  return (
    <View
      {...rest}
      style={[styles.wrap, { marginRight: shadow, marginBottom: shadow }, style]}
    >
      {/* deepest ground shadow */}
      {shadow > 0 ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: edge,
              top: shadow,
              left: shadow,
              right: -shadow,
              bottom: -shadow,
            },
          ]}
        />
      ) : null}
      {/* mid-step (gives more depth than a single shadow plane) */}
      {shadow > 2 ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: midShadow,
              top: drop,
              left: drop,
              right: -drop,
              bottom: -drop,
            },
          ]}
        />
      ) : null}
      <View
        style={{
          backgroundColor: faceBg,
          borderColor: edge,
          borderWidth,
        }}
      >
        {/* top inset highlight */}
        {hi ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: inner,
              backgroundColor: hi,
            }}
          />
        ) : null}
        {/* left inset highlight */}
        {hi ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: Math.max(2, inner - 1),
              backgroundColor: hi,
            }}
          />
        ) : null}
        {/* bottom inset shadow */}
        {lo ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: inner,
              backgroundColor: lo,
            }}
          />
        ) : null}
        {/* right inset shadow */}
        {lo ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: Math.max(2, inner - 1),
              backgroundColor: lo,
            }}
          />
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
