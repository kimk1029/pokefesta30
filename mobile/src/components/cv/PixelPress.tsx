import {
  Pressable,
  View,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/theme/tokens';
import { useThemeColors } from '../ThemeProvider';
import { PixelDeco } from './PixelDeco';

interface Props extends PressableProps {
  bg?: string;
  border?: string;
  borderWidth?: number;
  shadow?: number;
  hi?: string | null;
  lo?: string | null;
  inner?: number;
  innerStyle?: StyleProp<ViewStyle>;
  /** Pressable wrap style (margins, alignSelf, etc) */
  wrapStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * 웹 globals.css `.my-item` / `.pri-btn` 의 누름 가능한 픽셀 버튼을 재현.
 *
 * 평상시: 4방향 ink 테두리(꼭지점 한 칸 빔) + 상/좌 하이라이트 + 하/우 음영 + 꼭지점 빈 단일 하드 드롭섀도.
 * 누를 때: 웹 `:active{transform:translate(Npx,Npx); box-shadow ... Npx Npx 0 ink}` 처럼
 *          면이 드롭섀도 자리로 내려앉으며 섀도가 거의 사라진다.
 * 모서리는 radius 가 아니라 꼭지점 한 칸을 비운 큰 픽셀 노치(배경 노출).
 */
export function PixelPress({
  bg = colors.white,
  border = colors.ink,
  borderWidth = 4,
  shadow = 6,
  hi = 'rgba(255,255,255,0.85)',
  lo = 'rgba(0,0,0,0.18)',
  inner = 3,
  innerStyle,
  wrapStyle,
  children,
  style,
  ...rest
}: Props) {
  const c = useThemeColors();
  const faceBg = bg === colors.white ? c.white : bg;
  const edge = border === colors.ink ? c.ink : border;
  const loThick = Math.max(2, inner + 1);
  const cut = borderWidth;
  return (
    <Pressable {...rest}>
      {(state) => {
        const pressed = state.pressed;
        const off = pressed ? 1 : shadow;
        const styleVal = typeof style === 'function' ? style(state) : style;
        return (
          <View style={[styles.wrap, { marginRight: off, marginBottom: off }, wrapStyle, styleVal]}>
            {/* 꼭지점 빈 단일 하드 드롭섀도 */}
            {shadow > 0 ? (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, { top: off, left: off, right: -off, bottom: -off }]}
              >
                <PixelDeco faceBg={edge} edge={edge} cut={cut} border={false} />
              </View>
            ) : null}
            <View
              style={[
                styles.face,
                {
                  transform: [
                    { translateX: pressed ? shadow - off : 0 },
                    { translateY: pressed ? shadow - off : 0 },
                  ],
                },
              ]}
            >
              <PixelDeco
                faceBg={faceBg}
                edge={edge}
                cut={cut}
                hi={hi}
                lo={lo}
                inner={inner}
                loThick={loThick}
                pressed={pressed}
              />
              {/* 투명 테두리로 콘텐츠를 테두리 안쪽으로 들여놓는다(기존 borderWidth 와 동일한 인셋) */}
              <View style={[{ borderWidth: cut, borderColor: 'transparent', backgroundColor: 'transparent' }, innerStyle]}>
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
