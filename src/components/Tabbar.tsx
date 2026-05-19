import { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { router, usePathname } from 'expo-router';
import { colors } from '@/theme/tokens';
import { PixelText } from './PixelText';
import { DotBall } from './DotBall';
import { TabIcon, type TabIconName } from './TabIcon';

type TabId = 'home' | 'collection' | 'fab' | 'community' | 'my';

interface Tab {
  id: TabId;
  label: string;
  icon?: TabIconName;
  href: string;
  fab?: boolean;
}

const TABS: Tab[] = [
  { id: 'home', label: '홈', icon: 'home', href: '/' },
  { id: 'collection', label: '컬렉션', icon: 'collection', href: '/my/cards' },
  { id: 'fab', label: '스캔', href: '/scan', fab: true },
  { id: 'community', label: '커뮤니티', icon: 'community', href: '/feed' },
  { id: 'my', label: '마이', icon: 'my', href: '/my' },
];

function activeId(pathname: string): TabId | '' {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/my/cards')) return 'collection';
  if (pathname.startsWith('/scan')) return 'fab';
  if (pathname.startsWith('/feed') || pathname.startsWith('/trade')) return 'community';
  if (pathname.startsWith('/my')) return 'my';
  return '';
}

export function Tabbar() {
  const pathname = usePathname();
  const active = activeId(pathname);

  return (
    <View style={styles.bar}>
      <View pointerEvents="none" style={styles.topAccent} />
      {TABS.map((t) => {
        const isOn = active === t.id;
        if (t.fab) return <FabTab key={t.id} on={isOn} label={t.label} href={t.href} />;
        return (
          <TabBtn
            key={t.id}
            on={isOn}
            label={t.label}
            icon={t.icon!}
            href={t.href}
          />
        );
      })}
    </View>
  );
}

interface TabBtnProps {
  on: boolean;
  label: string;
  icon: TabIconName;
  href: string;
}

function TabBtn({ on, label, icon, href }: TabBtnProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () =>
    Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, friction: 6, tension: 240 }).start();
  const onOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 200 }).start();
  return (
    <Pressable
      style={styles.tab}
      onPressIn={onIn}
      onPressOut={onOut}
      onPress={() => router.push(href as never)}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {on ? <View style={styles.activeDot} /> : null}
        <TabIcon name={icon} color={on ? colors.gold : colors.pap3} size={24} />
        <PixelText
          variant="pixel"
          size={11}
          color={on ? colors.gold : colors.pap3}
          style={{ marginTop: 5, letterSpacing: 0.5 }}
        >
          {label}
        </PixelText>
      </Animated.View>
    </Pressable>
  );
}

interface FabProps {
  on: boolean;
  label: string;
  href: string;
}

function FabTab({ on, label, href }: FabProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const onPress = () => {
    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (isMounted.current) router.push(href as never);
    });
  };

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <Pressable style={styles.tab} onPress={onPress}>
      <Animated.View style={[styles.fabCircle, { transform: [{ rotate }] }]}>
        <DotBall size={62} />
      </Animated.View>
      <PixelText
        variant="pixel"
        size={11}
        color={on ? colors.gold : colors.pap3}
        style={{ marginTop: 38, letterSpacing: 0.5 }}
      >
        {label}
      </PixelText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.ink,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 4,
    minHeight: 88,
    borderTopWidth: 3,
    borderTopColor: colors.ink,
    position: 'relative',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.gold,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    minHeight: 56,
    position: 'relative',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: -8,
    width: 5,
    height: 5,
    backgroundColor: colors.gold,
  },
  fabCircle: {
    position: 'absolute',
    top: -36,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
