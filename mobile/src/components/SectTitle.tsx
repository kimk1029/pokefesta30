import { View } from 'react-native';
import { colors, space } from '@/theme/tokens';
import { PixelText } from './PixelText';
import { PixelFrame } from './cv/PixelFrame';

interface Props {
  title: string;
  more?: string;
}

/**
 * 섹션 제목 바 — ink 박스 + 골드 하드 드롭섀도 + 베벨, 꼭지점 노치 코너.
 * 다른 픽셀 박스와 동일한 입체 처리([[PixelFrame]]).
 */
export function SectTitle({ title, more }: Props) {
  return (
    <PixelFrame
      bg={colors.ink}
      border={colors.ink}
      shadowColor={colors.goldDk}
      borderWidth={3}
      shadow={5}
      hi={colors.ink2}
      lo="#000"
      inner={2}
      style={{ marginHorizontal: space.gap, marginBottom: space.cg }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <PixelText variant="pixel" size={12} color={colors.yel}>
          {title}
        </PixelText>
        {more ? (
          <PixelText variant="pixel" size={9} color={colors.pap3}>
            {more}
          </PixelText>
        ) : null}
      </View>
    </PixelFrame>
  );
}
