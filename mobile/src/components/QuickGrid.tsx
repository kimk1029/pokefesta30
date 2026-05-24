import { View, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { colors, space } from '@/theme/tokens';
import { PixelText } from './PixelText';

interface Item {
  href: string;
  color: 'r' | 'b' | 'y' | 'g';
  icon: string;
  label: string;
}

const ITEMS: Item[] = [
  { href: '/scan', color: 'g', icon: '📷', label: '스캔' },
  { href: '/cards', color: 'y', icon: '¥', label: '시세확인' },
  { href: '/cards/mvc-auction', color: 'b', icon: '🔨', label: 'MVC경매' },
  { href: '/cards/bunjang', color: 'r', icon: '🇰🇷', label: '국내마켓' },
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
            <Text style={[styles.iconText, { color: FG[it.color] }]}>{it.icon}</Text>
          </View>
          <PixelText
            variant="pixel"
            size={10}
            color={colors.ink}
            style={{ marginTop: 6 }}
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
