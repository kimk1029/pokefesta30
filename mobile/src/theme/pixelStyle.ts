/**
 * RN에서 CSS box-shadow 픽셀 외곽선을 흉내내는 헬퍼.
 * 원본 CSS는 4방향 hard shadow + 우하단 offset shadow를 합쳤는데,
 * RN은 box-shadow가 없으니 borderWidth + 우하단 "그림자 뷰"로 대체한다.
 */
import type { ViewStyle } from 'react-native';
import { colors } from './tokens';

export function pixelEdge(
  borderColor: string = colors.ink,
  borderWidth: number = 3,
): ViewStyle {
  return {
    borderColor,
    borderWidth,
    borderStyle: 'solid',
  };
}

/**
 * 우하단 픽셀 그림자 효과를 위해
 * 컨테이너에 marginRight/marginBottom을 두고 그림자 뷰를 절대배치하는 방식 권장.
 * 더 단순한 방식 — RN의 elevation/shadow 사용.
 */
export function dropShadow(offset = 4): ViewStyle {
  return {
    shadowColor: colors.ink,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  };
}
