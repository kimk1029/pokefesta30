import { Text, type TextProps, StyleSheet } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

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
  const useKo = variant === 'ko' || containsHangul(children);
  const finalSize = size + 1;
  const koFont = weight === 'bold' ? fonts.koBold : fonts.ko;
  return (
    <Text
      style={[
        styles.base,
        useKo ? styles.ko : styles.pixel,
        {
          fontFamily: useKo ? koFont : fonts.pixel,
          fontSize: finalSize,
          lineHeight: Math.round(finalSize * (useKo ? 1.5 : 1.25)),
          color,
          fontWeight: weight,
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
});
