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
  { href: '/live',  color: 'r', icon: '📍', label: '현황' },
  { href: '/trade', color: 'b', icon: '🤝', label: '거래' },
  { href: '/cards', color: 'y', icon: '📊', label: '시세' },
  { href: '/map',   color: 'g', icon: '🗺',  label: '지도' },
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
    gap: 8,
  },
  qi: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.ink,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
  iconText: {
    fontSize: 22,
  },
});
