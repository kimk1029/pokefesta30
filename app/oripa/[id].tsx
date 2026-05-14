import { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelButton } from '@/components/PixelButton';
import { colors, space } from '@/theme/tokens';
import { ORIPA_BOXES, ORIPA_TICKETS } from '@/lib/data';
import type { OripaGrade, OripaTicket } from '@/lib/types';

const G_BG: Record<OripaGrade, string> = {
  S: colors.pur,
  A: colors.blu,
  B: colors.red,
  C: colors.grn,
  last: colors.yel,
};

interface RevealResult {
  index: number;
  grade: OripaGrade;
  prizeName: string;
  prizeEmoji: string;
}

export default function OripaPlay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const box = ORIPA_BOXES.find((b) => b.id === id) ?? ORIPA_BOXES[0];

  const [tickets, setTickets] = useState<OripaTicket[]>(ORIPA_TICKETS);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reveal, setReveal] = useState<RevealResult | null>(null);

  const remaining = useMemo(
    () => tickets.filter((t) => !t.drawn).length,
    [tickets],
  );

  const toggle = (i: number) => {
    if (tickets[i].drawn) return;
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  const draw = () => {
    const sel = Array.from(selected);
    if (sel.length === 0) return;
    const target = sel[0];
    const grades: OripaGrade[] = ['C', 'C', 'C', 'B', 'B', 'A', 'S'];
    const grade = grades[Math.floor(Math.random() * grades.length)];
    const prizeName =
      grade === 'S'
        ? '잉어킹 홀로 프레임'
        : grade === 'A'
          ? '프리미엄 뱃지'
          : grade === 'B'
            ? '몬스터볼 스킨'
            : '스티커 팩';
    const prizeEmoji =
      grade === 'S' ? '🖼' : grade === 'A' ? '🏅' : grade === 'B' ? '⚪' : '🌟';
    setTickets((arr) =>
      arr.map((t, i) =>
        i === target
          ? { ...t, drawn: true, grade, prizeName, prizeEmoji, drawnBy: '🐣', drawnAt: '방금 전' }
          : t,
      ),
    );
    setSelected(new Set());
    setReveal({ index: target, grade, prizeName, prizeEmoji });
  };

  const random = () => {
    const undrawn = tickets.filter((t) => !t.drawn).map((t) => t.index);
    if (undrawn.length === 0) return;
    const pick = undrawn[Math.floor(Math.random() * undrawn.length)];
    setSelected(new Set([pick]));
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBar title={box.name} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headCard}>
          <PixelText variant="pixel" size={9} color={colors.ink3}>
            잔여 티켓
          </PixelText>
          <PixelText
            variant="pixel"
            size={28}
            color={colors.ink}
            style={{ marginTop: 6 }}
          >
            {remaining} / 100
          </PixelText>
          <View style={styles.barOuter}>
            <View style={[styles.barFill, { width: `${remaining}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
            <PixelButton
              bg={colors.white}
              padding={10}
              style={{ flex: 1 }}
              onPress={random}
            >
              <PixelText
                variant="pixel"
                size={9}
                color={colors.ink}
                style={{ textAlign: 'center' }}
              >
                랜덤 선택
              </PixelText>
            </PixelButton>
            <PixelButton
              bg={selected.size > 0 ? colors.red : colors.pap3}
              padding={10}
              style={{ flex: 2 }}
              onPress={draw}
            >
              <PixelText
                variant="pixel"
                size={10}
                color={colors.white}
                style={{ textAlign: 'center' }}
              >
                {selected.size}장 뽑기 · {box.price * Math.max(1, selected.size)}P
              </PixelText>
            </PixelButton>
          </View>
        </View>

        <View style={styles.gridWrap}>
          <View style={styles.grid}>
            {tickets.map((t) => {
              const isSel = selected.has(t.index);
              const tBg = t.drawn
                ? t.grade
                  ? G_BG[t.grade]
                  : colors.ink2
                : isSel
                  ? colors.yel
                  : colors.white;
              return (
                <Pressable
                  key={t.index}
                  style={[styles.tk, { backgroundColor: tBg }]}
                  onPress={() => toggle(t.index)}
                >
                  <PixelText
                    variant="pixel"
                    size={8}
                    color={t.drawn ? colors.white : colors.ink}
                  >
                    {t.drawn ? t.grade ?? 'X' : t.index + 1}
                  </PixelText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!reveal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pullCard}>
            <PixelText
              variant="pixel"
              size={9}
              color={colors.ink3}
              style={{ textAlign: 'center' }}
            >
              티켓 #{(reveal?.index ?? 0) + 1}
            </PixelText>
            <Text style={styles.bigEmoji}>{reveal?.prizeEmoji}</Text>
            <PixelText
              variant="pixel"
              size={14}
              color={colors.ink}
              style={{ textAlign: 'center', marginTop: 8 }}
            >
              {reveal?.grade} 등급
            </PixelText>
            <PixelText
              variant="pixel"
              size={11}
              color={colors.red}
              style={{ textAlign: 'center', marginTop: 8, lineHeight: 16 }}
            >
              {reveal?.prizeName}
            </PixelText>
            <View style={{ marginTop: 16 }}>
              <PixelButton
                bg={colors.ink}
                padding={12}
                onPress={() => setReveal(null)}
              >
                <PixelText
                  variant="pixel"
                  size={10}
                  color={colors.yel}
                  style={{ textAlign: 'center' }}
                >
                  확인
                </PixelText>
              </PixelButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headCard: {
    margin: space.gap,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  barOuter: {
    height: 14,
    marginTop: 10,
    backgroundColor: colors.pap2,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  barFill: { height: '100%', backgroundColor: colors.grn },
  gridWrap: {
    paddingHorizontal: space.gap,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    backgroundColor: colors.pap2,
    padding: 8,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  tk: {
    width: 30,
    height: 30,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pullCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.white,
    padding: 20,
    borderWidth: 4,
    borderColor: colors.ink,
  },
  bigEmoji: {
    fontSize: 80,
    textAlign: 'center',
    marginVertical: 12,
  },
});
