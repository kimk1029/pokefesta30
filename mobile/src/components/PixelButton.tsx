import { Pressable, type PressableProps, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { useThemeColors } from './ThemeProvider';
import { PixelDeco } from './cv/PixelDeco';

interface Props extends PressableProps {
  bg?: string;
  border?: string;
  borderWidth?: number;
  shadowOffset?: number;
  padding?: number;
}

/**
 * 웹 버튼과 같은 4방향 외곽선(꼭지점 한 칸 빔) + 단일 우하단 하드 섀도 버튼.
 * pressed 상태에서 면이 그림자 자리로 내려앉는다.
 */
export function PixelButton({
  bg = colors.white,
  border = colors.ink,
  borderWidth = 4,
  shadowOffset = 6,
  padding = 10,
  style,
  children,
  ...rest
}: Props) {
  const c = useThemeColors();
  const faceBg = bg === colors.white ? c.white : bg;
  const edge = border === colors.ink ? c.ink : border;
  const cut = borderWidth;
  const loThick = Math.max(2, borderWidth);
  return (
    <Pressable {...rest}>
      {({ pressed }) => {
        const off = pressed ? 1 : shadowOffset;
        const styleVal = typeof style === 'function' ? style({ pressed }) : style;
        return (
          <View style={[styles.wrap, { marginRight: off, marginBottom: off }, styleVal]}>
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, { top: off, left: off, right: -off, bottom: -off }]}
            >
              <PixelDeco faceBg={edge} edge={edge} cut={cut} border={false} />
            </View>
            <View
              style={[
                styles.face,
                {
                  transform: [
                    { translateX: pressed ? shadowOffset - off : 0 },
                    { translateY: pressed ? shadowOffset - off : 0 },
                  ],
                },
              ]}
            >
              <PixelDeco
                faceBg={faceBg}
                edge={edge}
                cut={cut}
                hi="rgba(255,255,255,0.85)"
                lo="rgba(0,0,0,0.18)"
                inner={3}
                loThick={loThick}
                pressed={pressed}
              />
              <View style={{ borderWidth: cut, borderColor: 'transparent', backgroundColor: 'transparent', padding }}>
                {children as React.ReactNode}
              </View>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  face: { position: 'relative' },
});
