import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

/**
 * Smoother Pokeball — circular silhouette with pixel-style outline + button.
 * Replaces the chunky 10x10 PixelBall when a rounder look is needed.
 */
export function RoundBall({ size = 56 }: Props) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 64 64">
      {/* outline */}
      <Circle cx="32" cy="32" r="30" fill="#1A1A2E" />
      {/* red top half */}
      <Path d="M 4 32 A 28 28 0 0 1 60 32 Z" fill="#E63946" />
      {/* white bottom half */}
      <Path d="M 4 32 A 28 28 0 0 0 60 32 Z" fill="#FFFFFF" />
      {/* shine on top-left */}
      <Path d="M 12 22 Q 16 14 26 12" stroke="#FF6470" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* equator band */}
      <Rect x="4" y="29" width="56" height="6" fill="#1A1A2E" />
      {/* center button outer ring */}
      <Circle cx="32" cy="32" r="9" fill="#1A1A2E" />
      {/* center button white */}
      <Circle cx="32" cy="32" r="6" fill="#FFFFFF" />
      {/* center button inner dot */}
      <Circle cx="32" cy="32" r="2.5" fill="#94A3B8" />
    </Svg>
  );
}
