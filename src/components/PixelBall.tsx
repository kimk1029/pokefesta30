/**
 * 테마별 픽셀 마크. 모든 variant 를 DOM 에 렌더하고
 * `[data-theme]` 셀렉터로 CSS 가 표시 토글.
 *
 * - pokemon  : 몬스터볼
 * - onepiece : 위에서 본 루피의 밀짚모자 (탄 brim + 빨강 띠)
 * - yugioh   : 천년 퍼즐 — 위에서 본 황금 사각 + 호루스의 눈
 * - sports   : 흰 공 + 잔디색 라인
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
      {/* pokemon variant — 몬스터볼 */}
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

      {/* onepiece variant — 위에서 본 밀짚모자.
          바깥 = 밀짚 brim, 안쪽 = 빨강 띠, 중앙 = 모자 정수리(어두운 밀짚). */}
      <svg
        className="ball-onepiece"
        width={size}
        height={size}
        viewBox="0 0 10 10"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {/* 외곽 검정 테두리 (둥근 사각) */}
        <rect x="2" y="0" width="6" height="1" fill="#1A1A2E" />
        <rect x="1" y="1" width="1" height="1" fill="#1A1A2E" />
        <rect x="8" y="1" width="1" height="1" fill="#1A1A2E" />
        <rect x="0" y="2" width="1" height="6" fill="#1A1A2E" />
        <rect x="9" y="2" width="1" height="6" fill="#1A1A2E" />
        <rect x="1" y="8" width="1" height="1" fill="#1A1A2E" />
        <rect x="8" y="8" width="1" height="1" fill="#1A1A2E" />
        <rect x="2" y="9" width="6" height="1" fill="#1A1A2E" />
        {/* 밀짚 brim (밝은 밀짚색) */}
        <rect x="2" y="1" width="6" height="1" fill="#F4D272" />
        <rect x="1" y="2" width="8" height="2" fill="#F4D272" />
        <rect x="1" y="6" width="8" height="2" fill="#F4D272" />
        <rect x="2" y="8" width="6" height="1" fill="#F4D272" />
        {/* 빨강 띠 (모자와 brim 경계) */}
        <rect x="2" y="4" width="6" height="1" fill="#E63946" />
        <rect x="2" y="5" width="6" height="1" fill="#E63946" />
        {/* 모자 정수리 살짝 어두운 밀짚 */}
        <rect x="3" y="4" width="4" height="2" fill="#D9A85D" />
        {/* brim 하이라이트 (왼쪽 위) */}
        <rect x="2" y="1" width="3" height="1" fill="#FCE6A8" />
        <rect x="1" y="2" width="1" height="2" fill="#FCE6A8" />
      </svg>

      {/* yugioh variant — 천년 퍼즐 정사각 + 호루스의 눈 */}
      <svg
        className="ball-yugioh"
        width={size}
        height={size}
        viewBox="0 0 10 10"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {/* 외곽 검정 */}
        <rect x="0" y="0" width="10" height="1" fill="#1A1A2E" />
        <rect x="0" y="9" width="10" height="1" fill="#1A1A2E" />
        <rect x="0" y="1" width="1" height="8" fill="#1A1A2E" />
        <rect x="9" y="1" width="1" height="8" fill="#1A1A2E" />
        {/* 황금 본체 */}
        <rect x="1" y="1" width="8" height="8" fill="#FFD23F" />
        {/* 황금 하이라이트 (상단) */}
        <rect x="1" y="1" width="8" height="1" fill="#FCE6A8" />
        {/* 황금 그림자 (하단) */}
        <rect x="1" y="8" width="8" height="1" fill="#B8860B" />
        {/* 호루스의 눈 — 가로 줄 + 검정 동공 */}
        <rect x="3" y="4" width="4" height="1" fill="#1A1A2E" />
        <rect x="4" y="5" width="2" height="1" fill="#1A1A2E" />
        <rect x="4" y="4" width="2" height="1" fill="#FFFFFF" />
      </svg>

      {/* sports variant — 경기장 공 아이콘 */}
      <svg
        className="ball-sports"
        width={size}
        height={size}
        viewBox="0 0 10 10"
        style={{ shapeRendering: 'crispEdges' }}
      >
        <rect x="3" y="0" width="4" height="1" fill="#111827" />
        <rect x="2" y="1" width="1" height="1" fill="#111827" />
        <rect x="7" y="1" width="1" height="1" fill="#111827" />
        <rect x="1" y="2" width="1" height="1" fill="#111827" />
        <rect x="8" y="2" width="1" height="1" fill="#111827" />
        <rect x="0" y="3" width="1" height="4" fill="#111827" />
        <rect x="9" y="3" width="1" height="4" fill="#111827" />
        <rect x="1" y="7" width="1" height="1" fill="#111827" />
        <rect x="8" y="7" width="1" height="1" fill="#111827" />
        <rect x="2" y="8" width="1" height="1" fill="#111827" />
        <rect x="7" y="8" width="1" height="1" fill="#111827" />
        <rect x="3" y="9" width="4" height="1" fill="#111827" />
        <rect x="3" y="1" width="4" height="1" fill="#FFFFFF" />
        <rect x="2" y="2" width="6" height="1" fill="#FFFFFF" />
        <rect x="1" y="3" width="8" height="4" fill="#FFFFFF" />
        <rect x="2" y="7" width="6" height="1" fill="#FFFFFF" />
        <rect x="3" y="8" width="4" height="1" fill="#FFFFFF" />
        <rect x="4" y="1" width="2" height="8" fill="#16A34A" />
        <rect x="1" y="4" width="8" height="2" fill="#16A34A" />
        <rect x="4" y="4" width="2" height="2" fill="#FFFFFF" />
      </svg>
    </span>
  );
}
