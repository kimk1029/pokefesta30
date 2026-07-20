/**
 * 스니덩크 카드 타일 — 세로 이미지 + 한글명 2줄 + 원문명 작게 + 빨강 가격('시세 없음'
 * 폴백) + 매물수 메타. /cards/packs/[code] 그리드·리스트행, /my/favorites 그리드 등
 * 복붙 패턴 통합.
 *
 * variant="grid": 세로 타일 (썸네일 위 + 정보 블록 아래, borderTop 구분선).
 * variant="row" : 가로 행 (64×88 썸네일 + 텍스트 컬럼 + › 셰브런).
 * 래퍼는 기본 PixelPress(액센트 보더 지원), plainPress 로 맨 Pressable 전환
 * (바깥에서 보더·배경을 그리는 관심카드 그리드용).
 */
import { Pressable, View } from 'react-native';
import { PixelText } from '../PixelText';
import { PixelPress } from './PixelPress';
import { ThumbImage } from './ThumbImage';
import { useThemeColors, useThemeTextVariant } from '../ThemeProvider';

interface Props {
  variant?: 'grid' | 'row';
  onPress: () => void;
  imageUrl: string | null;
  koName: string;
  /** 원문(일본어)명 — 작은 보조 줄. 없으면 미렌더. */
  subName?: string | null;
  /** 표시용 가격 텍스트 — null/빈 값이면 '시세 없음' 폴백. */
  priceText?: string | null;
  /** 매물수 등 메타 줄 — 없으면 미렌더. */
  metaText?: string | null;
  /** PixelPress 액센트 — grid: borderTop 4 / row: borderLeft 4. */
  accentColor?: string;
  /** grid 전용 — 세로 비율 썸네일(지정 시 thumbHeight 무시). */
  thumbAspect?: number;
  thumbHeight?: number;
  thumbResizeMethod?: 'auto' | 'resize' | 'scale';
  emojiSize?: number;
  nameSize?: number;
  nameBold?: boolean;
  nameMinHeight?: number;
  nameLineHeight?: number;
  /** grid 전용 — 정보 블록 패딩 (기본 5). */
  infoPadding?: number;
  /** grid 전용 — 가격을 잉크칩(골드 텍스트)으로 표시 (관심카드 스타일). */
  priceChip?: boolean;
  /** PixelPress 대신 스타일 없는 Pressable 래퍼. */
  plainPress?: boolean;
}

export function SnkrdunkCardTile({
  variant = 'grid',
  onPress,
  imageUrl,
  koName,
  subName,
  priceText,
  metaText,
  accentColor,
  thumbAspect,
  thumbHeight = 120,
  thumbResizeMethod,
  emojiSize,
  nameSize,
  nameBold = true,
  nameMinHeight,
  nameLineHeight,
  infoPadding = 5,
  priceChip = false,
  plainPress = false,
}: Props) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const hasPrice = Boolean(priceText);
  const price = priceText || '시세 없음';

  if (variant === 'row') {
    return (
      <PixelPress
        onPress={onPress}
        innerStyle={accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : undefined}
      >
        <View style={{ flexDirection: 'row', gap: 12, padding: 10, alignItems: 'center' }}>
          <ThumbImage
            uri={imageUrl}
            style={{ width: 64, height: 88 }}
            borderColor={tc.ink}
            emojiSize={emojiSize ?? 24}
            resizeMethod={thumbResizeMethod}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <PixelText variant="ko" size={nameSize ?? 12} weight={nameBold ? 'bold' : 'normal'} numberOfLines={2}>
              {koName}
            </PixelText>
            {subName != null ? (
              <PixelText variant={txt} size={8} color={tc.ink3} numberOfLines={1} style={{ marginTop: 3 }}>
                {subName}
              </PixelText>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <PixelText variant={txt} size={11} color={tc.red}>
                {price}
              </PixelText>
              {metaText != null ? (
                <PixelText variant={txt} size={8} color={tc.ink3}>
                  {metaText}
                </PixelText>
              ) : null}
            </View>
          </View>
          <PixelText variant={txt} size={14} color={tc.ink3}>›</PixelText>
        </View>
      </PixelPress>
    );
  }

  const inner = (
    <View>
      <ThumbImage
        uri={imageUrl}
        style={thumbAspect != null ? { aspectRatio: thumbAspect } : { height: thumbHeight }}
        emojiSize={emojiSize ?? 30}
        resizeMethod={thumbResizeMethod}
      />
      <View style={{ padding: infoPadding, borderTopColor: tc.ink, borderTopWidth: 3 }}>
        <PixelText
          variant="ko"
          size={nameSize ?? 11}
          weight={nameBold ? 'bold' : 'normal'}
          numberOfLines={2}
          style={{ minHeight: nameMinHeight, lineHeight: nameLineHeight }}
        >
          {koName}
        </PixelText>
        {subName != null ? (
          <PixelText variant={txt} size={7} color={tc.ink3} numberOfLines={1} style={{ marginTop: 2 }}>
            {subName}
          </PixelText>
        ) : null}
        {priceChip ? (
          <View
            style={{
              marginTop: 5,
              paddingHorizontal: 5,
              paddingVertical: 2,
              backgroundColor: hasPrice ? tc.ink : tc.pap2,
              alignSelf: 'flex-start',
            }}
          >
            <PixelText variant={txt} size={10} color={hasPrice ? tc.gold : tc.ink3}>
              {price}
            </PixelText>
          </View>
        ) : (
          <PixelText variant={txt} size={10} color={tc.red} numberOfLines={1} style={{ marginTop: 6 }}>
            {price}
          </PixelText>
        )}
        {metaText != null ? (
          <PixelText variant={txt} size={8} color={tc.ink3} numberOfLines={1} style={{ marginTop: 3 }}>
            {metaText}
          </PixelText>
        ) : null}
      </View>
    </View>
  );

  if (plainPress) {
    return <Pressable onPress={onPress}>{inner}</Pressable>;
  }
  return (
    <PixelPress
      onPress={onPress}
      innerStyle={accentColor ? { borderTopWidth: 4, borderTopColor: accentColor } : undefined}
    >
      {inner}
    </PixelPress>
  );
}
