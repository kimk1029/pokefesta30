import { View, Pressable } from 'react-native';
import { PixelText } from '../PixelText';
import { PixelFrame } from './PixelFrame';
import { useThemeColors, useThemeTextVariant, useTheme } from '../ThemeProvider';
import { isFlatTheme } from '@/lib/theme';

interface Props {
  title: string;
  more?: string;
  onMore?: () => void;
}

/**
 * 섹션 헤더 — 픽셀 테마: ink 박스 + 골드 드롭섀도.
 * 플랫(clean·dark) 테마: 박스 없이 깔끔한 텍스트 헤더(웹 프로토타입과 동일).
 */
export function SectHd({ title, more, onMore }: Props) {
  const c = useThemeColors();
  const textVariant = useThemeTextVariant();
  const { theme } = useTheme();

  if (isFlatTheme(theme)) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 }}>
        <PixelText variant={textVariant} size={14} weight="bold" color={c.ink} style={{ flex: 1 }}>
          {title}
        </PixelText>
        {more && onMore ? (
          <Pressable onPress={onMore}>
            <PixelText variant={textVariant} size={11} color={c.ink3}>
              {more}
            </PixelText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <PixelFrame
      bg={c.ink}
      border={c.ink}
      shadowColor={c.goldDk}
      borderWidth={3}
      shadow={5}
      hi={c.ink2}
      lo="#000"
      inner={2}
      style={{ marginBottom: 6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7 }}>
        <PixelText variant={textVariant} size={12} weight="bold" color={c.gold} style={{ flex: 1 }}>
          {title}
        </PixelText>
        {more && onMore ? (
          <Pressable onPress={onMore}>
            <PixelText variant={textVariant} size={9} color={c.pap3}>
              {more}
            </PixelText>
          </Pressable>
        ) : null}
      </View>
    </PixelFrame>
  );
}
