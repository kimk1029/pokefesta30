/**
 * 테마별 픽셀 마크. 두 SVG variant 를 둘 다 DOM 에 렌더하고
 * `[data-theme]` 속성 셀렉터로 CSS 가 표시 토글.
 *
 * - pokemon: 몬스터볼 (현재 디자인)
 * - default / minimal: 색만 다른 사각 마크 ("픽셀 30" 배지)
 *
 * SSR 안전 — 어떤 테마든 첫 페인트에서 정확히 한 variant 만 보임.
 */
export function PixelBall({ size = 22 }: { size?: number }) {
  return (
    <span
      className="ball-themed"
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        position: 'relative',
        lineHeight: 0,
      }}
      aria-hidden
    >
      {/* pokemon variant */}
      <svg
        className="ball-pokemon"
        width={size}
        height={size}
        viewBox="0 0 10 10"
        style={{ shapeRendering: 'crispEdges' }}
      >
        <rect x="3" y="0" width="4" height="1" fill="#1A1A2E" />
        <rect x="2" y="1" width="1" height="1" fill="#1A1A2E" />
        <rect x="7" y="1" width="1" height="1" fill="#1A1A2E" />
        <rect x="3" y="1" width="4" height="1" fill="#E63946" />
        <rect x="1" y="2" width="1" height="1" fill="#1A1A2E" />
        <rect x="8" y="2" width="1" height="1" fill="#1A1A2E" />
        <rect x="2" y="2" width="6" height="1" fill="#E63946" />
        <rect x="0" y="3" width="1" height="1" fill="#1A1A2E" />
        <rect x="9" y="3" width="1" height="1" fill="#1A1A2E" />
        <rect x="1" y="3" width="8" height="1" fill="#E63946" />
        <rect x="0" y="4" width="10" height="1" fill="#1A1A2E" />
        <rect x="0" y="5" width="1" height="1" fill="#1A1A2E" />
        <rect x="9" y="5" width="1" height="1" fill="#1A1A2E" />
        <rect x="1" y="5" width="3" height="1" fill="#FFFFFF" />
        <rect x="6" y="5" width="3" height="1" fill="#FFFFFF" />
        <rect x="4" y="5" width="2" height="1" fill="#1A1A2E" />
        <rect x="0" y="6" width="1" height="1" fill="#1A1A2E" />
        <rect x="9" y="6" width="1" height="1" fill="#1A1A2E" />
        <rect x="1" y="6" width="3" height="1" fill="#FFFFFF" />
        <rect x="6" y="6" width="3" height="1" fill="#FFFFFF" />
        <rect x="4" y="6" width="1" height="1" fill="#1A1A2E" />
        <rect x="5" y="6" width="1" height="1" fill="#FFFFFF" />
        <rect x="1" y="7" width="1" height="1" fill="#1A1A2E" />
        <rect x="8" y="7" width="1" height="1" fill="#1A1A2E" />
        <rect x="2" y="7" width="6" height="1" fill="#FFFFFF" />
        <rect x="2" y="8" width="1" height="1" fill="#1A1A2E" />
        <rect x="7" y="8" width="1" height="1" fill="#1A1A2E" />
        <rect x="3" y="8" width="4" height="1" fill="#FFFFFF" />
        <rect x="3" y="9" width="4" height="1" fill="#1A1A2E" />
      </svg>

      {/* default + minimal variant — 색은 currentColor 로 CSS 가 결정 */}
      <svg
        className="ball-pixel"
        width={size}
        height={size}
        viewBox="0 0 10 10"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {/* 검정 외곽 1px 테두리 */}
        <rect x="1" y="0" width="8" height="1" fill="#1A1A2E" />
        <rect x="0" y="1" width="1" height="8" fill="#1A1A2E" />
        <rect x="9" y="1" width="1" height="8" fill="#1A1A2E" />
        <rect x="1" y="9" width="8" height="1" fill="#1A1A2E" />
        {/* 본체 — currentColor */}
        <rect x="1" y="1" width="8" height="8" fill="currentColor" />
        {/* 상단 하이라이트 픽셀 */}
        <rect x="1" y="1" width="8" height="1" fill="rgba(255,255,255,.55)" />
        <rect x="1" y="2" width="1" height="6" fill="rgba(255,255,255,.35)" />
        {/* 하단/우측 그림자 픽셀 */}
        <rect x="1" y="8" width="8" height="1" fill="rgba(0,0,0,.25)" />
        <rect x="8" y="2" width="1" height="6" fill="rgba(0,0,0,.18)" />
        {/* 중앙 점 */}
        <rect x="4" y="4" width="2" height="2" fill="#1A1A2E" />
      </svg>
    </span>
  );
}
