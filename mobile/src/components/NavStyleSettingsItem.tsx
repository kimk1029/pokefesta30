import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavPrefs } from './NavPrefsProvider';
import { PixelText } from './PixelText';
import { colors } from '@/theme/tokens';

/**
 * 마이페이지 설정 — 하단 네비게이션 스타일 토글.
 * off(기본)=통합형(꽉 찬 고정 탭바) / on=분리형(둥근 플로팅 바).
 */
export function NavStyleSettingsItem() {
  const { navStyle, toggleNavStyle } = useNavPrefs();
  const on = navStyle === 'floating';

  return (
    <Pressable onPress={toggleNavStyle} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: on ? colors.blu : colors.pap3 }]}>
        <Text style={styles.iconText}>🧭</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <PixelText variant="ko" size={12} color={colors.ink} weight="bold" numberOfLines={1}>
          네비게이션 스타일
        </PixelText>
        <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 2 }} numberOfLines={1}>
          {on ? '분리형 · 둥근 플로팅 바' : '통합형 · 꽉 찬 고정 탭바'}
        </PixelText>
      </View>
      <View style={[styles.track, { backgroundColor: on ? colors.blu : colors.pap3 }]}>
        <View style={[styles.knob, { left: on ? 18 : 2 }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.ink,
    borderWidth: 2,
  },
  iconText: { fontSize: 16 },
  track: {
    width: 36,
    height: 20,
    borderRadius: 999,
    borderColor: colors.ink,
    borderWidth: 1,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderWidth: 1,
  },
});
