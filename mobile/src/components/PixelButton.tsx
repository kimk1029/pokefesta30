import { Pressable, type PressableProps, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { useThemeColors } from './ThemeProvider';

interface Props extends PressableProps {
  bg?: string;
  border?: string;
  borderWidth?: number;
  shadowOffset?: number;
  padding?: number;
}

/**
 * 픽셀 외곽선 + 우하단 hard shadow 버튼.
 * pressed 상태에서 그림자가 줄어들어 "눌리는" 느낌.
 */
export function PixelButton({
  bg = colors.white,
  border = colors.ink,
  borderWidth = 3,
  shadowOffset = 4,
  padding = 10,
  style,
  children,
  ...rest
}: Props) {
  const c = useThemeColors();
  const faceBg = bg === colors.white ? c.white : bg;
  const edge = border === colors.ink ? c.ink : border;
  return (
    <Pressable {...rest}>
      {({ pressed }) => {
        const off = pressed ? Math.max(1, shadowOffset - 2) : shadowOffset;
        const styleVal =
          typeof style === 'function' ? style({ pressed }) : style;
        return (
          <View
            style={[
              styles.wrap,
              { marginRight: off, marginBottom: off },
              styleVal,
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: edge,
                  top: off,
                  left: off,
                  right: -off,
                  bottom: -off,
                },
              ]}
            />
            <View
              style={{
                backgroundColor: faceBg,
                borderColor: edge,
                borderWidth,
                padding,
              }}
            >
              {children as React.ReactNode}
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
