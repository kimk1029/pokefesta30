/**
 * 위에서 본 루피의 밀짚모자 — 원피스 테마용 FAB 콘텐츠.
 * 웹 Tabbar 의 fab-strawhat SVG 와 동일 구조.
 */
import Svg, { Ellipse, G, Line, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

export function StrawHatBall({ size = 62 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* 밀짚 brim (살짝 타원) */}
      <Ellipse cx={50} cy={52} rx={46} ry={42} fill="#F4D272" stroke="#1A1A2E" strokeWidth={3} />
      {/* brim 짚 결 — 방사선 */}
      <G stroke="rgba(95,55,15,0.32)" strokeWidth={1.2}>
        <Line x1={50} y1={14} x2={50} y2={24} />
        <Line x1={50} y1={80} x2={50} y2={90} />
        <Line x1={6} y1={52} x2={16} y2={52} />
        <Line x1={84} y1={52} x2={94} y2={52} />
        <Line x1={20} y1={22} x2={27} y2={29} />
        <Line x1={73} y1={29} x2={80} y2={22} />
        <Line x1={20} y1={82} x2={27} y2={75} />
        <Line x1={73} y1={75} x2={80} y2={82} />
      </G>
      {/* 안쪽 brim 그림자 */}
      <Ellipse cx={50} cy={52} rx={34} ry={30} fill="#D9A85D" />
      {/* 빨간 띠 (모자 띠) */}
      <Ellipse cx={50} cy={52} rx={28} ry={24} fill="#E63946" stroke="#1A1A2E" strokeWidth={2} />
      {/* 노란 patch */}
      <Rect x={44} y={42} width={12} height={3} fill="#FFD23F" />
      {/* 모자 정수리 */}
      <Ellipse cx={50} cy={50} rx={18} ry={16} fill="#B8884B" stroke="#1A1A2E" strokeWidth={2} />
      {/* 정수리 하이라이트 */}
      <Ellipse cx={42} cy={44} rx={6} ry={3} fill="#F4D272" opacity={0.6} />
      {/* 끈 양옆 */}
      <Line x1={4} y1={52} x2={14} y2={56} stroke="#1A1A2E" strokeWidth={2} />
      <Line x1={86} y1={56} x2={96} y2={52} stroke="#1A1A2E" strokeWidth={2} />
    </Svg>
  );
}
