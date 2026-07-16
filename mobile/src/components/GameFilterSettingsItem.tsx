import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GAME_OPTIONS } from '@/lib/gamePrefs';
import { useGamePrefs } from './GamePrefsProvider';
import { PixelText } from './PixelText';
import { colors } from '@/theme/tokens';

/**
 * 마이페이지 설정 — 카드 게임(포켓몬/원피스/유희왕/스포츠) 표시 토글 행 묶음.
 * 켠 게임만 홈 인기·박스 캐러셀과 시세확인(팩) 목록에 나온다.
 * 전부 켜면 모든 게임 카드가 함께 나오고, 최소 1개는 켜져 있어야 한다.
 */
export function GameFilterSettingsItem() {
  const { enabledGames, toggleGame } = useGamePrefs();

  return (
    <View>
      {GAME_OPTIONS.map((g, i) => {
        const on = enabledGames.includes(g.id);
        const last = on && enabledGames.length <= 1;
        return (
          <View key={g.id}>
            {i > 0 && <View style={styles.divider} />}
            <Pressable onPress={() => toggleGame(g.id)} style={[styles.row, last && { opacity: 0.6 }]}>
              <View style={[styles.icon, { backgroundColor: on ? colors.grn : colors.pap3 }]}>
                <Text style={styles.iconText}>{g.emoji}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <PixelText variant="ko" size={12} color={colors.ink} weight="bold" numberOfLines={1}>
                  {g.label} 카드 보기
                </PixelText>
                <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 2 }} numberOfLines={1}>
                  {last ? '켜짐 · 최소 1개는 켜져 있어야 해요' : on ? '켜짐 · 홈/시세 목록에 표시' : '꺼짐 · 목록에서 제외'}
                </PixelText>
              </View>
              {/* 토글 스위치 */}
              <View style={[styles.track, { backgroundColor: on ? colors.grn : colors.pap3 }]}>
                <View style={[styles.knob, { left: on ? 18 : 2 }]} />
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
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
  divider: {
    height: 1,
    backgroundColor: colors.pap3,
    marginHorizontal: 14,
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
