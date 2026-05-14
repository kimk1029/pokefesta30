import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { colors } from '@/theme/tokens';

export type TabIconName = 'home' | 'collection' | 'community' | 'my' | 'plus' | 'live' | 'trade';

interface Props {
  name: TabIconName;
  color?: string;
  size?: number;
}

export function TabIcon({ name, color = colors.ink, size = 22 }: Props) {
  const sw = 2.2;
  const stroke = color;
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M3 10l9-7 9 7v10a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V10z"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
          />
        </Svg>
      );
    case 'collection':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={3} width={18} height={18} stroke={stroke} strokeWidth={sw} fill="none" />
          <Line x1={3} y1={9} x2={21} y2={9} stroke={stroke} strokeWidth={sw} />
          <Line x1={3} y1={15} x2={21} y2={15} stroke={stroke} strokeWidth={sw} />
        </Svg>
      );
    case 'community':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
          />
        </Svg>
      );
    case 'my':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={8} r={4} stroke={stroke} strokeWidth={sw} fill="none" />
          <Path
            d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21"
            stroke={stroke}
            strokeWidth={sw}
            fill="none"
          />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 5 V19" stroke={stroke} strokeWidth={3} fill="none" />
          <Path d="M5 12 H19" stroke={stroke} strokeWidth={3} fill="none" />
        </Svg>
      );
    // legacy — Tabbar 외에서 import 했을 수 있어 호환 유지
    case 'live':
    case 'trade':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={sw} fill="none" />
        </Svg>
      );
  }
}
