import Svg, { Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

const RECTS: Array<[number, number, number, number, string]> = [
  [2, 0, 6, 1, '#1A1A2E'],
  [1, 1, 1, 1, '#1A1A2E'],
  [8, 1, 1, 1, '#1A1A2E'],
  [0, 2, 1, 6, '#1A1A2E'],
  [9, 2, 1, 6, '#1A1A2E'],
  [1, 8, 1, 1, '#1A1A2E'],
  [8, 8, 1, 1, '#1A1A2E'],
  [2, 9, 6, 1, '#1A1A2E'],
  [2, 1, 6, 1, '#E63946'],
  [1, 2, 8, 2, '#E63946'],
  [1, 4, 8, 1, '#1A1A2E'],
  [1, 5, 8, 2, '#FFFFFF'],
  [1, 7, 8, 1, '#FFFFFF'],
  [2, 8, 6, 1, '#FFFFFF'],
  [4, 3, 2, 4, '#1A1A2E'],
  [3, 4, 4, 2, '#1A1A2E'],
  [4, 4, 2, 2, '#FFFFFF'],
  [2, 1, 2, 1, '#FF6470'],
  [1, 2, 2, 1, '#FF6470'],
];

export function PixelBall({ size = 22 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      {RECTS.map(([x, y, w, h, fill], i) => (
        <Rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </Svg>
  );
}
