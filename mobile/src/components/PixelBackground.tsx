import Svg, { Rect, Defs, LinearGradient, Stop, Circle, Polygon } from 'react-native-svg';
import { colors } from '@/theme/tokens';

export type BackgroundId =
  | 'default'
  | 'grass'
  | 'sea'
  | 'mountain'
  | 'forest'
  | 'sunset'
  | 'city'
  | 'space'
  | 'volcano'
  | 'cave';

interface Props {
  id?: BackgroundId;
  width?: number;
  height?: number;
}

/**
 * 픽셀 배경 — 16:10 비율, 8가지 시나리오. 원본보다 단순화된 버전.
 */
export function PixelBackground({
  id = 'default',
  width = 160,
  height = 100,
}: Props) {
  const W = 160;
  const H = 100;
  const props = { width, height, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' as const };

  switch (id) {
    case 'grass':
      return (
        <Svg {...props}>
          <Rect x={0} y={0} width={W} height={60} fill="#7AC7FF" />
          <Rect x={0} y={60} width={W} height={40} fill="#4ADE80" />
          <Circle cx={130} cy={20} r={10} fill="#FFD23F" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Rect key={i} x={i * 28} y={70} width={6} height={6} fill="#0F6B2E" />
          ))}
        </Svg>
      );
    case 'sea':
      return (
        <Svg {...props}>
          <Defs>
            <LinearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#7A94FF" />
              <Stop offset="1" stopColor="#1B2E89" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill="url(#sea)" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Rect key={i} x={i * 36} y={50 + (i % 2) * 8} width={20} height={2} fill="#FFFFFF" opacity={0.6} />
          ))}
        </Svg>
      );
    case 'mountain':
      return (
        <Svg {...props}>
          <Rect x={0} y={0} width={W} height={H} fill="#FFE987" />
          <Polygon points="0,80 40,40 70,70 110,30 160,80 160,100 0,100" fill="#3D1D6B" />
          <Polygon points="40,40 50,30 60,40" fill="#FFFFFF" />
          <Polygon points="110,30 120,18 130,30" fill="#FFFFFF" />
        </Svg>
      );
    case 'forest':
      return (
        <Svg {...props}>
          <Rect x={0} y={0} width={W} height={H} fill="#0F6B2E" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Polygon
              key={i}
              points={`${i * 24},80 ${i * 24 + 12},40 ${i * 24 + 24},80`}
              fill="#1A4A1F"
            />
          ))}
        </Svg>
      );
    case 'sunset':
      return (
        <Svg {...props}>
          <Defs>
            <LinearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FB923C" />
              <Stop offset="1" stopColor="#E63946" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill="url(#sun)" />
          <Circle cx={80} cy={70} r={28} fill="#FFD23F" />
        </Svg>
      );
    case 'city':
      return (
        <Svg {...props}>
          <Rect x={0} y={0} width={W} height={H} fill="#1B2E89" />
          {[0, 24, 50, 78, 110, 138].map((x, i) => (
            <Rect key={i} x={x} y={H - (30 + (i % 3) * 12)} width={18} height={H} fill="#1A1A2E" />
          ))}
          {Array.from({ length: 30 }).map((_, i) => (
            <Rect key={i} x={(i * 11) % W} y={50 + (i % 5) * 10} width={2} height={2} fill="#FFD23F" />
          ))}
        </Svg>
      );
    case 'space':
      return (
        <Svg {...props}>
          <Rect x={0} y={0} width={W} height={H} fill="#0D1A5A" />
          {Array.from({ length: 40 }).map((_, i) => (
            <Rect key={i} x={(i * 17) % W} y={(i * 11) % H} width={2} height={2} fill="#FFFFFF" />
          ))}
          <Circle cx={120} cy={30} r={12} fill="#9B6FD0" />
        </Svg>
      );
    case 'volcano':
      return (
        <Svg {...props}>
          <Rect x={0} y={0} width={W} height={H} fill="#3D1D6B" />
          <Polygon points="40,80 80,30 120,80" fill="#1A1A2E" />
          <Polygon points="70,40 80,28 90,40" fill="#FB923C" />
          <Polygon points="60,80 80,50 100,80" fill="#E63946" />
        </Svg>
      );
    case 'cave':
      return (
        <Svg {...props}>
          <Rect x={0} y={0} width={W} height={H} fill="#1A1A2E" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Polygon key={i} points={`${i * 36},0 ${i * 36 + 14},20 ${i * 36 + 28},0`} fill="#2E3550" />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <Polygon
              key={i}
              points={`${i * 36 + 18},${H} ${i * 36 + 30},${H - 20} ${i * 36 + 42},${H}`}
              fill="#2E3550"
            />
          ))}
        </Svg>
      );
    default:
      return (
        <Svg {...props}>
          <Defs>
            <LinearGradient id="def" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.pap2} />
              <Stop offset="1" stopColor={colors.pap3} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill="url(#def)" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Rect key={i} x={i * 28 + 4} y={50 + (i % 2) * 8} width={6} height={6} fill={colors.papdk} />
          ))}
        </Svg>
      );
  }
}
