import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useHomePrefs } from './HomePrefsProvider';
import { PixelText } from './PixelText';
import { colors, fonts } from '@/theme/tokens';

/**
 * 마이페이지 설정 — "메인에 내 포트폴리오 보이기" 토글 행.
 * off(기본) 면 홈 메인에서 토탈 포트폴리오 hero 를 숨긴다.
 * (내 컬렉션 상단에는 이 설정과 무관하게 항상 노출.)
 */
export function ShowPortfolioSettingsItem() {
  const { showPortfolioOnMain, toggleShowPortfolioOnMain } = useHomePrefs();
  const on = showPortfolioOnMain;

  return (
    <Pressable onPress={toggleShowPortfolioOnMain} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: on ? colors.grn : colors.pap3 }]}>
        <Text style={styles.iconText}>📊</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <PixelText variant="ko" size={12} color={colors.ink} weight="bold" numberOfLines={1}>
          메인에 내 포트폴리오 보이기
        </PixelText>
        <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 2 }} numberOfLines={1}>
          {on ? '켜짐 · 메인 상단에 표시' : '꺼짐 · 컬렉션 상단에서만 표시'}
        </PixelText>
      </View>
      {/* 토글 스위치 */}
      <View style={[styles.track, { backgroundColor: on ? colors.grn : colors.pap3 }]}>
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
