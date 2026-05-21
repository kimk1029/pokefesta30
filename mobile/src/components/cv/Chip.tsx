import { Pressable, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { PixelText } from '../PixelText';

interface Props {
  on?: boolean;
  onPress?: () => void;
  bg?: string;
  fg?: string;
  size?: number;
  px?: number;
  py?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Chip({
  on = false,
  onPress,
  bg,
  fg,
  size = 10,
  px = 10,
  py = 8,
  style,
  children,
}: Props) {
  const shadow = 3;
  const finalBg = on ? colors.gold : bg || colors.white;
  const finalFg = on ? colors.ink : fg || colors.ink;
  return (
    <Pressable onPress={onPress} style={[styles.wrap, { marginRight: shadow, marginBottom: shadow }, style]}>
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
          backgroundColor: finalBg,
          borderColor: colors.ink,
          borderWidth: 2,
          paddingHorizontal: px,
          height: 30,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PixelText variant="pixel" size={size} color={finalFg}>
          {children as string}
        </PixelText>
        {on ? (
          <>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: colors.goldLt,
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
                backgroundColor: colors.goldDk,
              }}
            />
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignSelf: 'flex-start' },
});
