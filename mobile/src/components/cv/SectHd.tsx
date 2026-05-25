import { View, Pressable } from 'react-native';
import { PixelText } from '../PixelText';
import { PixelFrame } from './PixelFrame';
import { useThemeColors, useThemeTextVariant } from '../ThemeProvider';

interface Props {
  title: string;
  more?: string;
  onMore?: () => void;
}

/**
 * Dark section header — ink 박스 + 골드 하드 드롭섀도 + 상/하 베벨.
 * 다른 픽셀 박스와 동일하게 꼭지점 한 칸이 빈 큰-픽셀 노치 코너([[PixelFrame]] → [[PixelDeco]]).
 */
export function SectHd({ title, more, onMore }: Props) {
  const c = useThemeColors();
  const textVariant = useThemeTextVariant();
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
      style={{ marginBottom: 12 }}
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
