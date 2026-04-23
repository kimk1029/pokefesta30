import type { BackgroundId } from '@/lib/shop';

/**
 * 프로필 아바타 뒤에 깔리는 픽셀 배경.
 * viewBox 16:10, preserveAspectRatio 으로 컨테이너 꽉 채움.
 * 각 배경은 간단한 직사각형/도형 조합의 픽셀 신 (30-60 rect 선에서).
 */
interface Props {
  id: BackgroundId;
}

export function PixelBackground({ id }: Props) {
  return (
    <svg
      className="pix-bg"
      viewBox="0 0 32 20"
      preserveAspectRatio="none"
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
        shapeRendering: 'crispEdges',
      }}
    >
      {RENDERERS[id]?.() ?? RENDERERS.default()}
    </svg>
  );
}

const RENDERERS: Record<BackgroundId, () => React.ReactNode> = {
  default: () => (
    <>
      <rect x="0" y="0" width="32" height="20" fill="#9BC5E5" />
      <circle cx="24" cy="5" r="2" fill="#FFF3A0" />
      <circle cx="7" cy="4" r="2" fill="#FFFFFF" />
      <circle cx="12" cy="5" r="1" fill="#FFFFFF" />
    </>
  ),

  grass: () => (
    <>
      <rect x="0" y="0" width="32" height="12" fill="#9BC5E5" />
      <rect x="0" y="12" width="32" height="8" fill="#7FCE92" />
      <rect x="0" y="11" width="32" height="1" fill="#4FA077" />
      {[2, 7, 12, 18, 24, 29].map((x) => (
        <rect key={x} x={x} y="13" width="1" height="2" fill="#4FA077" />
      ))}
      <circle cx="6" cy="5" r="2" fill="#FFFFFF" />
      <circle cx="22" cy="4" r="2" fill="#FFFFFF" />
      <circle cx="27" cy="6" r="1" fill="#FFFFFF" />
    </>
  ),

  sea: () => (
    <>
      <rect x="0" y="0" width="32" height="10" fill="#6FC0E5" />
      <rect x="0" y="10" width="32" height="10" fill="#3A8FC2" />
      {[0, 6, 12, 18, 24].map((x) => (
        <rect key={`w1-${x}`} x={x} y="12" width="3" height="1" fill="#9BC5E5" />
      ))}
      {[3, 9, 15, 21, 27].map((x) => (
        <rect key={`w2-${x}`} x={x} y="15" width="3" height="1" fill="#9BC5E5" />
      ))}
      <circle cx="24" cy="4" r="2" fill="#FFF3A0" />
    </>
  ),

  mountain: () => (
    <>
      <rect x="0" y="0" width="32" height="14" fill="#C9D4E0" />
      <rect x="0" y="14" width="32" height="6" fill="#7FCE92" />
      <polygon points="0,14 8,4 16,14" fill="#6B7490" />
      <polygon points="0,14 8,4 10,6 14,10 16,14" fill="#8A92A8" />
      <polygon points="8,4 9,5 10,4 10,6 8,5" fill="#FFFFFF" />
      <polygon points="12,14 22,2 32,14" fill="#5C6478" />
      <polygon points="22,2 20,4 22,5 24,3" fill="#FFFFFF" />
      <circle cx="6" cy="4" r="1" fill="#FFFFFF" />
    </>
  ),

  forest: () => (
    <>
      <rect x="0" y="0" width="32" height="13" fill="#7FB980" />
      <rect x="0" y="13" width="32" height="7" fill="#5A8247" />
      {[1, 5, 9, 13, 17, 21, 25, 29].map((x) => (
        <g key={x}>
          <rect x={x} y="9" width="2" height="4" fill="#2E5A1B" />
          <polygon points={`${x - 1},10 ${x + 1},6 ${x + 3},10`} fill="#3E7A2B" />
          <polygon points={`${x - 1},8 ${x + 1},4 ${x + 3},8`} fill="#4E9A3B" />
        </g>
      ))}
    </>
  ),

  sunset: () => (
    <>
      <rect x="0" y="0" width="32" height="20" fill="#FF8A50" />
      <rect x="0" y="0" width="32" height="4" fill="#6B3FA0" />
      <rect x="0" y="4" width="32" height="3" fill="#C46EA0" />
      <rect x="0" y="7" width="32" height="3" fill="#FDB57D" />
      <rect x="0" y="16" width="32" height="4" fill="#3A2040" />
      <circle cx="16" cy="12" r="4" fill="#FFD23F" />
      <circle cx="16" cy="12" r="3" fill="#FFA020" />
    </>
  ),

  city: () => (
    <>
      <rect x="0" y="0" width="32" height="20" fill="#1B2E89" />
      <circle cx="4" cy="3" r="1" fill="#FFD23F" />
      <circle cx="10" cy="2" r="1" fill="#FFFFFF" />
      <circle cx="20" cy="4" r="1" fill="#FFFFFF" />
      <circle cx="27" cy="3" r="1" fill="#FFD23F" />
      <rect x="0" y="13" width="4" height="7" fill="#3A2040" />
      <rect x="4" y="10" width="5" height="10" fill="#2E1834" />
      <rect x="9" y="12" width="3" height="8" fill="#3A2040" />
      <rect x="12" y="8" width="6" height="12" fill="#2E1834" />
      <rect x="18" y="11" width="4" height="9" fill="#3A2040" />
      <rect x="22" y="9" width="5" height="11" fill="#2E1834" />
      <rect x="27" y="13" width="5" height="7" fill="#3A2040" />
      {/* lit windows */}
      {[
        [5, 12], [6, 15], [7, 14], [13, 11], [14, 13], [15, 16], [17, 14],
        [19, 14], [23, 12], [24, 15], [25, 13], [28, 15], [29, 17],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill="#FFD23F" />
      ))}
    </>
  ),

  space: () => (
    <>
      <rect x="0" y="0" width="32" height="20" fill="#0D1A5A" />
      {[
        [2, 3], [5, 8], [9, 2], [13, 6], [17, 10], [20, 3], [24, 7], [28, 4],
        [30, 14], [3, 16], [8, 17], [12, 14], [26, 17], [15, 17],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill="#FFFFFF" />
      ))}
      <circle cx="24" cy="13" r="3" fill="#9BC5E5" />
      <circle cx="23" cy="12" r="1" fill="#6FC0E5" />
      <circle cx="25" cy="14" r="1" fill="#6FC0E5" />
    </>
  ),

  volcano: () => (
    <>
      <rect x="0" y="0" width="32" height="12" fill="#6B1A1A" />
      <rect x="0" y="12" width="32" height="8" fill="#E63946" />
      <polygon points="8,12 16,3 24,12" fill="#3A0E0E" />
      <polygon points="13,6 16,3 19,6 18,5 16,6 14,5" fill="#FF8A50" />
      <polygon points="14,6 15,4 16,6 17,4 18,6" fill="#FFD23F" />
      {/* lava flow */}
      <rect x="12" y="12" width="2" height="3" fill="#FFD23F" />
      <rect x="14" y="13" width="2" height="3" fill="#FF8A50" />
      <rect x="16" y="14" width="2" height="3" fill="#FFD23F" />
      <rect x="11" y="16" width="10" height="1" fill="#FF8A50" />
    </>
  ),

  cave: () => (
    <>
      <rect x="0" y="0" width="32" height="20" fill="#2E1834" />
      {/* stalactites */}
      {[2, 7, 14, 20, 26, 30].map((x, i) => (
        <polygon key={`s-${i}`} points={`${x},0 ${x + 2},0 ${x + 1},3`} fill="#1A0E20" />
      ))}
      {/* floor stones */}
      <rect x="0" y="16" width="32" height="4" fill="#3A2040" />
      <rect x="0" y="17" width="6" height="1" fill="#5C3168" />
      <rect x="8" y="18" width="5" height="1" fill="#5C3168" />
      <rect x="16" y="17" width="8" height="1" fill="#5C3168" />
      {/* crystals */}
      <polygon points="12,16 14,12 16,16" fill="#6FC0E5" />
      <polygon points="12,16 14,12 14,16" fill="#3A8FC2" />
      <polygon points="22,16 24,13 26,16" fill="#EA9EC4" />
    </>
  ),
};
