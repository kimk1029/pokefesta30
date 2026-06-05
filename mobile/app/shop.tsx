import { useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, Text } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelButton } from '@/components/PixelButton';
import { colors, space } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import { SHOP_ITEMS } from '@/lib/data';
import type { ShopItem } from '@/lib/types';

type Tab = ShopItem['category'];
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'charge', label: '충전' },
  { id: 'ticket', label: '티켓' },
  { id: 'skin',   label: '스킨' },
];

const TAG_COLOR: Record<NonNullable<ShopItem['tag']>, string> = {
  hot: colors.red,
  new: colors.blu,
  limited: colors.pur,
};

export default function Shop() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const [tab, setTab] = useState<Tab>('charge');
  const items = SHOP_ITEMS.filter((s) => s.category === tab);

  return (
    <View style={{ flex: 1 }}>
      <AppBar title="상점" />
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            style={[
              styles.tab,
              tab === t.id && { backgroundColor: tc.ink },
            ]}
            onPress={() => setTab(t.id)}
          >
            <PixelText
              variant={txt}
              size={10}
              color={tab === t.id ? tc.yel : tc.ink}
            >
              {t.label}
            </PixelText>
          </Pressable>
        ))}
      </View>
      <ScrollView
        contentContainerStyle={{ padding: space.gap, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((it) => (
          <View key={it.id} style={styles.card}>
            <View style={[styles.icon, { backgroundColor: it.bg }]}>
              <Text style={{ fontSize: 28 }}>{it.emoji}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <PixelText variant={txt} size={11} color={tc.ink}>
                  {it.name}
                </PixelText>
                {it.tag ? (
                  <View
                    style={[styles.tag, { backgroundColor: TAG_COLOR[it.tag] }]}
                  >
                    <PixelText variant={txt} size={7} color={tc.white}>
                      {it.tag.toUpperCase()}
                    </PixelText>
                  </View>
                ) : null}
              </View>
              <PixelText
                variant={txt}
                size={9}
                color={tc.ink3}
                style={{ marginTop: 6, lineHeight: 14 }}
              >
                {it.desc}
              </PixelText>
            </View>
            <PixelButton bg={tc.red} padding={10}>
              <PixelText variant={txt} size={10} color={tc.white}>
                {it.price.toLocaleString()}
              </PixelText>
            </PixelButton>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    paddingHorizontal: space.gap,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: colors.ink,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderWidth: 3,
    borderColor: colors.ink,
    gap: 12,
  },
  icon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
  tag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.ink,
  },
});
