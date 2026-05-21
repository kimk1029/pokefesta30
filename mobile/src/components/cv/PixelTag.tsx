import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { PixelText } from '../PixelText';

interface Props {
  bg?: string;
  fg?: string;
  size?: number;
  px?: number;
  py?: number;
  shadow?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

/** Small pixel tag with offset shadow — used for rarity, game, market type chips. */
export function PixelTag({
  bg = colors.ink,
  fg = colors.gold,
  size = 9,
  px = 7,
  py = 3,
  shadow = 2,
  style,
  children,
}: Props) {
  return (
    <View style={[styles.wrap, { marginRight: shadow, marginBottom: shadow }, style]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: colors.ink,
            top: shadow,
            left: shadow,
            right: -shadow,
            bottom: -shadow,
          },
        ]}
      />
      <View
        style={{
          backgroundColor: bg,
          borderColor: colors.ink,
          borderWidth: 2,
          paddingHorizontal: px,
          paddingVertical: py,
          alignSelf: 'flex-start',
        }}
      >
        <PixelText
          variant="pixel"
          size={size}
          color={fg}
          style={{ letterSpacing: 0.5 }}
        >
          {children as string}
        </PixelText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignSelf: 'flex-start' },
});

export function fontStyle() {
  return { fontFamily: fonts.pixel };
}
