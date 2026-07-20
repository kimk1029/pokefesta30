/**
 * 마켓 매물 가로 행 — 84×84 썸네일 + 제목 2줄 + 빨강 가격('가격문의' 등은 호출부
 * 포맷) + 메타(📍지역 ❤찜수 등). 번개장터/KREAM/스니덩크 검색 결과 행의 복붙
 * 패턴(웹 .shop-card 재현) 통합.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { PixelText } from '../PixelText';
import { PixelPress } from './PixelPress';
import { ThumbImage } from './ThumbImage';
import { useThemeColors, useThemeTextVariant } from '../ThemeProvider';

interface Props {
  onPress: () => void;
  imageUrl: string | null;
  /** 이미지 없을 때 폴백 이모지 (기본 🃏, 박스매물은 📦). */
  fallbackEmoji?: string;
  title: string;
  /** 표시용 가격 텍스트 — '가격문의'/'—' 폴백은 호출부에서. */
  priceText: string;
  metaText: string;
  shadow?: number;
  /** 우상단 별 토글 등 절대배치 오버레이 — 래퍼(position: relative) 기준. */
  rightSlot?: ReactNode;
  /** rightSlot 과의 겹침 방지용 제목 우측 패딩. */
  titlePaddingRight?: number;
}

export function MarketListRow({
  onPress,
  imageUrl,
  fallbackEmoji = '🃏',
  title,
  priceText,
  metaText,
  shadow = 5,
  rightSlot,
  titlePaddingRight,
}: Props) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={{ position: 'relative' }}>
      <PixelPress onPress={onPress} bg={tc.white} borderWidth={3} shadow={shadow} hi={null} lo={null}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
          <ThumbImage
            uri={imageUrl}
            size={84}
            bg={tc.ink2}
            borderColor={tc.ink}
            emoji={fallbackEmoji}
            emojiSize={30}
          />
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <PixelText
              variant="ko"
              size={12}
              numberOfLines={2}
              style={{ lineHeight: 17, paddingRight: titlePaddingRight }}
            >
              {title}
            </PixelText>
            <PixelText variant={txt} size={14} color={tc.red} numberOfLines={1} style={{ marginTop: 7 }}>
              {priceText}
            </PixelText>
            <PixelText variant={txt} size={8} color={tc.ink3} numberOfLines={1} style={{ marginTop: 6 }}>
              {metaText}
            </PixelText>
          </View>
        </View>
      </PixelPress>
      {rightSlot}
    </View>
  );
}
