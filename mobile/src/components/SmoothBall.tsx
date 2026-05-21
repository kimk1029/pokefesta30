import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

/**
 * Smooth pokeball matching the web .pf-pokeball-spinner: solid ink outline,
 * red top / black equator / white bottom, with a small black-ringed white
 * button at center. No shine — the rotation is the whole visual.
 */
export function SmoothBall({ size = 48 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="30" fill="#1A1A2E" />
      <Path d="M 4 32 A 28 28 0 0 1 60 32 Z" fill="#E63946" />
      <Path d="M 4 32 A 28 28 0 0 0 60 32 Z" fill="#FFFFFF" />
      <Rect x="4" y="29" width="56" height="6" fill="#1A1A2E" />
      <Circle cx="32" cy="32" r="8.5" fill="#1A1A2E" />
      <Circle cx="32" cy="32" r="5.5" fill="#FFFFFF" />
    </Svg>
  );
}
