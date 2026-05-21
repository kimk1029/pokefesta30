/**
 * 포켓볼 — 라디얼/리니어 그라디언트로 입체감 표현.
 *   • 빨강 반구 (RadialGradient: 밝은 톱-하이라이트 → 어두운 가장자리)
 *   • 흰 반구 (LinearGradient: 위쪽 밝음 → 아래쪽 살짝 어두움)
 *   • 검정 띠 (얇은 하이라이트 / 새도우 라인 포함)
 *   • 가운데 버튼: 외곽 ink → 흰 그라디언트 → 검정 점, 림 새도우 강조
 *   • 좌상단 광택 하이라이트 (specular gloss)
 */
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  ClipPath,
} from 'react-native-svg';

interface Props {
  size?: number;
}

const INK = '#1A1A2E';
const RED_LIGHT = '#FF6B7A';
const RED = '#E63946';
const RED_DARK = '#9F1F2D';
const WHITE = '#FFFFFF';
const WHITE_DIM = '#C8C8C8';

export function PokeballSpinner({ size = 44 }: Props) {
  const r = size / 2;
  const ring = Math.max(2, Math.round(size * 0.07));
  const innerR = r - ring / 2;
  const bandH = Math.max(1, Math.round(size * 0.1));
  const btnInkR = Math.round(size * 0.23);
  const btnWhiteR = Math.round(size * 0.15);
  const btnDotR = Math.max(1, Math.round(size * 0.05));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <ClipPath id="ballClip">
          <Circle cx={r} cy={r} r={innerR} />
        </ClipPath>
        {/* 빨강 반구: 좌상단 하이라이트, 우하단 다크 그라디언트 */}
        <RadialGradient id="redShade" cx="35%" cy="32%" r="80%">
          <Stop offset="0%" stopColor={RED_LIGHT} />
          <Stop offset="55%" stopColor={RED} />
          <Stop offset="100%" stopColor={RED_DARK} />
        </RadialGradient>
        {/* 흰 반구: 위쪽 밝음 → 아래쪽 살짝 회색 */}
        <LinearGradient id="whiteShade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={WHITE} />
          <Stop offset="100%" stopColor={WHITE_DIM} />
        </LinearGradient>
        {/* 가운데 버튼 흰부분: 좌상단 하이라이트로 볼록함 표현 */}
        <RadialGradient id="btnShade" cx="35%" cy="30%" r="70%">
          <Stop offset="0%" stopColor={WHITE} />
          <Stop offset="80%" stopColor="#E0E0E0" />
          <Stop offset="100%" stopColor="#A8A8A8" />
        </RadialGradient>
        {/* 좌상단 광택 글로스 */}
        <RadialGradient id="gloss" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <Stop offset="60%" stopColor="rgba(255,255,255,0.25)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </RadialGradient>
      </Defs>

      {/* 1. 외곽 검정 원 (외곽선) */}
      <Circle cx={r} cy={r} r={r} fill={INK} />

      {/* 2. 클립된 내부 — 빨강/흰 반구 + 띠 */}
      <G clipPath="url(#ballClip)">
        <Rect x={0} y={0} width={size} height={r} fill="url(#redShade)" />
        <Rect x={0} y={r} width={size} height={r} fill="url(#whiteShade)" />
        {/* 검정 띠 */}
        <Rect x={0} y={r - bandH / 2} width={size} height={bandH} fill={INK} />
        {/* 띠 위 하이라이트 라인 (위쪽 1px) */}
        <Rect
          x={0}
          y={r - bandH / 2}
          width={size}
          height={Math.max(1, size * 0.012)}
          fill="rgba(255,255,255,0.18)"
        />
        {/* 띠 아래 새도우 라인 */}
        <Rect
          x={0}
          y={r + bandH / 2 - Math.max(1, size * 0.012)}
          width={size}
          height={Math.max(1, size * 0.012)}
          fill="rgba(0,0,0,0.45)"
        />
        {/* 좌상단 광택 — 빨강 반구 위에 떠 있는 specular highlight */}
        <Ellipse
          cx={r * 0.55}
          cy={r * 0.55}
          rx={r * 0.42}
          ry={r * 0.28}
          fill="url(#gloss)"
        />
      </G>

      {/* 3. 가운데 버튼 — 외곽 ink → 흰 그라디언트 → 점 */}
      <Circle cx={r} cy={r} r={btnInkR} fill={INK} />
      {/* ink 림과 흰 사이 미세한 베벨 */}
      <Circle
        cx={r}
        cy={r}
        r={btnInkR - Math.max(1, size * 0.012)}
        fill="rgba(255,255,255,0.12)"
      />
      <Circle cx={r} cy={r} r={btnWhiteR} fill="url(#btnShade)" />
      <Circle cx={r} cy={r} r={btnDotR} fill={INK} />
      {/* 버튼 좌상단 specular 점 */}
      <Circle
        cx={r - btnWhiteR * 0.35}
        cy={r - btnWhiteR * 0.35}
        r={Math.max(1, btnWhiteR * 0.22)}
        fill="rgba(255,255,255,0.85)"
      />
    </Svg>
  );
}
