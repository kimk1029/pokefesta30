import { Text, type TextProps, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { useTheme } from './ThemeProvider';
import { isFlatTheme } from '@/lib/theme';

interface Props extends TextProps {
  variant?: 'pixel' | 'ko';
  size?: number;
  color?: string;
  weight?: 'normal' | 'bold';
}

const HANGUL_RE = /[ㄱ-ㆎ가-힣]/;

function containsHangul(node: unknown): boolean {
  if (typeof node === 'string') return HANGUL_RE.test(node);
  if (typeof node === 'number') return false;
  if (Array.isArray(node)) return node.some(containsHangul);
  return false;
}

export function PixelText({
  variant = 'ko',
  size = 12,
  color = colors.ink,
  weight = 'normal',
  style,
  children,
  ...rest
}: Props) {
  const { theme } = useTheme();
  // 플랫(clean·dark) 테마 = 픽셀/갈무리 비트맵 폰트 대신 시스템 산세리프 (웹 Pretendard 느낌)
  const flat = isFlatTheme(theme);
  const useKo = variant === 'ko' || containsHangul(children);
  const finalSize = size + 1;
  const koFont = weight === 'bold' ? fonts.koBold : fonts.ko;
  return (
    <Text
      style={[
        styles.base,
        flat ? styles.sans : useKo ? styles.ko : styles.pixel,
        {
          fontFamily: flat ? undefined : useKo ? koFont : fonts.pixel,
          fontSize: finalSize,
          lineHeight: Math.round(finalSize * (flat || useKo ? 1.45 : 1.25)),
          color,
          fontWeight: flat ? (weight === 'bold' ? '700' : '400') : weight,
          letterSpacing: flat ? 0 : 0.5,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { letterSpacing: 0.5 },
  pixel: { includeFontPadding: false },
  ko: { includeFontPadding: true, textAlignVertical: 'center' },
  sans: { includeFontPadding: false, textAlignVertical: 'center' },
});
