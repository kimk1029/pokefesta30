import type { ReactNode } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { colors, space } from '@/theme/tokens';
import { PixelText } from './PixelText';

interface Item {
  href: string;
  color: 'r' | 'b' | 'y' | 'g';
  icon: ReactNode;
  label: string;
}

function KoreaMarketIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Rect x={3} y={7} width={16} height={12} fill={colors.ink} />
      <Rect x={5} y={9} width={12} height={8} fill={colors.white} />
      <Rect x={7} y={4} width={8} height={3} fill={colors.ink} />
      <Rect x={8} y={2} width={6} height={3} fill={colors.white} />
      <Rect x={9} y={11} width={4} height={4} fill={colors.red} />
      <Rect x={11} y={13} width={4} height={4} fill={colors.blu} />
      <Rect x={6} y={11} width={2} height={2} fill={colors.ink} />
      <Rect x={15} y={14} width={2} height={2} fill={colors.ink} />
    </Svg>
  );
}

const ITEMS: Item[] = [
  { href: '/scan', color: 'g', icon: '📷', label: '스캔' },
  { href: '/cards', color: 'y', icon: '¥', label: '시세확인' },
  { href: '/cards/mvc-auction', color: 'b', icon: '🔨', label: 'MVC경매' },
  { href: '/cards/bunjang', color: 'r', icon: <KoreaMarketIcon />, label: '국내마켓' },
  { href: '/trade', color: 'g', icon: '🤝', label: '거래' },
];

const BG: Record<Item['color'], string> = {
  r: colors.red,
  b: colors.blu,
  y: colors.yel,
  g: colors.grn,
};

const FG: Record<Item['color'], string> = {
  r: colors.white,
  b: colors.white,
  y: colors.ink,
  g: colors.ink,
};

export function QuickGrid() {
  return (
    <View style={styles.grid}>
      {ITEMS.map((it) => (
        <Pressable
          key={it.label}
          onPress={() => router.push(it.href as never)}
          style={({ pressed }) => [
            styles.qi,
            pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: BG[it.color] }]}>
            {typeof it.icon === 'string' ? (
              <Text style={[styles.iconText, { color: FG[it.color] }]}>{it.icon}</Text>
            ) : it.icon}
          </View>
          <PixelText
            variant="pixel"
            size={11}
            color={colors.ink}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ marginTop: 6, textAlign: 'center' }}
          >
            {it.label}
          </PixelText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    marginHorizontal: space.gap,
    marginBottom: space.cg,
    gap: 6,
  },
  qi: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 9,
    paddingHorizontal: 1,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.ink,
  },
  icon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
  iconText: {
    fontSize: 17,
  },
});
