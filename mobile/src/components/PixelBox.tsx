import { View, type ViewProps, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { useThemeColors } from './ThemeProvider';

interface Props extends ViewProps {
  bg?: string;
  border?: string;
  borderWidth?: number;
  shadowOffset?: number;
  noShadow?: boolean;
  hi?: string;
  lo?: string;
}

/**
 * 픽셀 카드/버튼 — 4방향 검정 보더 + 우하단 hard shadow
 *  + 상단 inset 하이라이트(흰색 라인) + 하단 inset 어둠(검은 라인)
 * 원본 CSS box-shadow의 다층 inset 효과를 layered View로 재현.
 */
export function PixelBox({
  bg = colors.white,
  border = colors.ink,
  borderWidth = 3,
  shadowOffset = 4,
  noShadow = false,
  hi = 'rgba(255,255,255,0.85)',
  lo = 'rgba(0,0,0,0.18)',
  style,
  children,
  ...rest
}: Props) {
  const c = useThemeColors();
  const faceBg = bg === colors.white ? c.white : bg;
  const edge = border === colors.ink ? c.ink : border;
  const inner = (
    <View
      style={[
        { backgroundColor: faceBg, borderColor: edge, borderWidth },
      ]}
      {...rest}
    >
      {/* inset top highlight */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: hi,
        }}
      />
      {/* inset bottom shadow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: lo,
        }}
      />
      {children}
    </View>
  );

  if (noShadow) {
    return <View style={style}>{inner}</View>;
  }
  return (
    <View
      style={[
        styles.wrap,
        { marginRight: shadowOffset, marginBottom: shadowOffset },
        style,
      ]}
    >
      {/* hard offset shadow */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: edge,
            top: shadowOffset,
            left: shadowOffset,
            right: -shadowOffset,
            bottom: -shadowOffset,
          },
        ]}
      />
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
