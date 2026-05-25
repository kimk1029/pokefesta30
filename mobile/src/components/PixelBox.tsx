import { View, type ViewProps, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { useThemeColors } from './ThemeProvider';
import { PixelDeco } from './cv/PixelDeco';

interface Props extends ViewProps {
  bg?: string;
  border?: string;
  borderWidth?: number;
  shadowOffset?: number;
  noShadow?: boolean;
  hi?: string | null;
  lo?: string | null;
}

/**
 * 픽셀 카드/버튼 — 웹 `.card`의 4방향 외곽선(꼭지점 한 칸 빔) + 단일 우하단 하드 섀도
 *  + 상/좌 하이라이트 + 하/우 음영. 모서리는 꼭지점을 비운 큰 픽셀 노치.
 */
export function PixelBox({
  bg = colors.white,
  border = colors.ink,
  borderWidth = 4,
  shadowOffset = 6,
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
  const cut = borderWidth;
  const loThick = Math.max(2, borderWidth);
  const inner = (
    <View style={styles.face} {...rest}>
      <PixelDeco faceBg={faceBg} edge={edge} cut={cut} hi={hi} lo={lo} inner={3} loThick={loThick} />
      <View style={{ borderWidth: cut, borderColor: 'transparent', backgroundColor: 'transparent' }}>
        {children}
      </View>
    </View>
  );

  if (noShadow) {
    return <View style={style}>{inner}</View>;
  }
  return (
    <View style={[styles.wrap, { marginRight: shadowOffset, marginBottom: shadowOffset }, style]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { top: shadowOffset, left: shadowOffset, right: -shadowOffset, bottom: -shadowOffset }]}
      >
        <PixelDeco faceBg={edge} edge={edge} cut={cut} border={false} />
      </View>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  face: { position: 'relative' },
});
