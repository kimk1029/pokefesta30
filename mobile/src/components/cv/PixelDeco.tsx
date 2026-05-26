import { View, StyleSheet } from 'react-native';

interface DecoProps {
  /** 면(채움) 색 */
  faceBg: string;
  /** 테두리/픽셀 색 (드롭섀도는 이 색으로 채움) */
  edge: string;
  /** 큰 픽셀 한 칸 = 테두리 두께이자 꼭지점에서 비워낼 정사각 크기 */
  cut: number;
  /** 4방향 ink 테두리를 그릴지 (드롭섀도는 false) */
  border?: boolean;
  /** 상/좌 하이라이트 색 (null 이면 생략) */
  hi?: string | null;
  /** 하/우 음영 색 (null 이면 생략) */
  lo?: string | null;
  /** 하이라이트 두께 */
  inner?: number;
  /** 음영 두께 */
  loThick?: number;
  /** 눌림 상태 — 하이라이트 숨김 */
  pressed?: boolean;
}

/**
 * 꼭지점이 빈 "큰 픽셀" 사각형 표면을 absolute 레이어로 그린다.
 *
 * - 채움(faceBg)을 십자(가로띠 + 세로띠)로 깔아 **네 꼭지점 cut×cut 칸을 투명하게 비움**
 *   → 뒤 배경이 비쳐 웹의 4방향 box-shadow 테두리와 동일한 픽셀 노치가 된다.
 * - border=true 면 상/하/좌/우 4개의 ink 띠를 꼭지점에서 cut 만큼 떨어뜨려 그린다(대각 코너는 비움).
 * - 베벨(상/좌 하이라이트, 하/우 음영)은 테두리 바로 안쪽에.
 *
 * 부모 frame 기준 absolute 이므로 부모(컨테이너)엔 padding/border 가 없어야 한다.
 */
export function PixelDeco({
  faceBg,
  edge,
  cut,
  border = true,
  hi = null,
  inner = 3,
  pressed = false,
}: DecoProps) {
  return (
    <>
      {/* 채움 십자 — 꼭지점 4칸만 비움 */}
      <View pointerEvents="none" style={[styles.abs, { top: 0, bottom: 0, left: cut, right: cut, backgroundColor: faceBg }]} />
      <View pointerEvents="none" style={[styles.abs, { top: cut, bottom: cut, left: 0, right: 0, backgroundColor: faceBg }]} />
      {/* 4방향 테두리 (꼭지점 비움) */}
      {border ? (
        <>
          <View pointerEvents="none" style={[styles.abs, { top: 0, left: cut, right: cut, height: cut, backgroundColor: edge }]} />
          <View pointerEvents="none" style={[styles.abs, { bottom: 0, left: cut, right: cut, height: cut, backgroundColor: edge }]} />
          <View pointerEvents="none" style={[styles.abs, { left: 0, top: cut, bottom: cut, width: cut, backgroundColor: edge }]} />
          <View pointerEvents="none" style={[styles.abs, { right: 0, top: cut, bottom: cut, width: cut, backgroundColor: edge }]} />
        </>
      ) : null}
      {/* 상단 하이라이트만 (밝은 띠 — 그림자가 아님, 누를 땐 숨김).
          하단/좌/우 음영(lo) 베벨은 그리지 않는다: 면 안쪽 회색 띠 + 바깥 드롭섀도가
          "그림자의 그림자"(2단)로 보였기 때문. 깊이감은 단일 드롭섀도로만 준다. */}
      {hi && !pressed ? (
        <View pointerEvents="none" style={[styles.abs, { top: cut, left: cut, right: cut, height: inner, backgroundColor: hi }]} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({ abs: { position: 'absolute' } });
