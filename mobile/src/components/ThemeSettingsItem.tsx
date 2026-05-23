import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './ThemeProvider';
import { THEMES, type ThemeId } from '@/lib/theme';
import { colors, fonts } from '@/theme/tokens';

const SWATCH_BG: Record<ThemeId, string> = {
  pokemon: '#E63946',
  onepiece: '#F4D272',
  yugioh: '#FFD23F',
};
const SWATCH_DOT: Record<ThemeId, string> = {
  pokemon: '#FFFFFF',
  onepiece: '#E63946',
  yugioh: '#7C3AED',
};

/** 마이페이지 설정 — 테마 행 + 모달 픽커. */
export function ThemeSettingsItem() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <>
      <Pressable style={styles.row} onPress={() => setOpen(true)}>
        <View style={[styles.iconBox, { backgroundColor: SWATCH_BG[theme] }]}>
          <View style={[styles.iconDot, { backgroundColor: SWATCH_DOT[theme] }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>
            테마 <Text style={styles.sub}>· {current.label}</Text>
          </Text>
        </View>
        <Text style={styles.arrow}>▶</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>테마 선택</Text>
            <Text style={styles.modalHint}>선택 즉시 반영. 다음 방문에도 유지.</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {THEMES.map((t) => {
                const active = t.id === theme;
                return (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.tile,
                      active ? { backgroundColor: colors.gold } : null,
                    ]}
                    onPress={() => {
                      setTheme(t.id);
                      setOpen(false);
                    }}
                  >
                    <View style={[styles.iconBox, { backgroundColor: SWATCH_BG[t.id] }]}>
                      <View style={[styles.iconDot, { backgroundColor: SWATCH_DOT[t.id] }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>{t.label}</Text>
                      <Text style={styles.tileDesc}>{t.desc}</Text>
                    </View>
                    {active && <Text style={styles.tileCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: colors.ink,
    shadowOpacity: 1,
    shadowOffset: { width: 3, height: 3 },
    shadowRadius: 0,
    elevation: 2,
  },
  iconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: { width: 10, height: 10 },
  label: { fontFamily: fonts.pixel, fontSize: 11, color: colors.ink, letterSpacing: 0.3 },
  sub: { color: colors.ink3, fontSize: 9 },
  arrow: { color: colors.ink3, fontFamily: fonts.pixel, fontSize: 12 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.paper,
    padding: 16,
    minWidth: 280,
    maxWidth: 360,
    shadowColor: colors.ink,
    shadowOpacity: 1,
    shadowOffset: { width: 5, height: 5 },
    shadowRadius: 0,
    elevation: 8,
  },
  modalTitle: { fontFamily: fonts.pixel, fontSize: 14, color: colors.ink },
  modalHint: { fontFamily: fonts.pixel, fontSize: 9, color: colors.ink3, marginTop: 6 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: colors.ink,
    shadowOpacity: 1,
    shadowOffset: { width: 2, height: 2 },
    shadowRadius: 0,
    elevation: 1,
  },
  tileDesc: { fontFamily: fonts.pixel, fontSize: 8, color: colors.ink3, marginTop: 4 },
  tileCheck: { fontFamily: fonts.pixel, fontSize: 12, color: colors.ink },
});
