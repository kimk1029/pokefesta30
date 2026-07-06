/**
 * /my/oripa — 오리파 박스 목록.
 * GET /api/oripa 로 활성 박스를 가져온다. 박스 탭 시 구매 모달(수량/할인/포인트)
 * → 입장 토큰 발급 → /oripa/[id]?qty=N 플레이로 이동 (웹 OripaPurchaseModal 동일).
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { SectHd } from '@/components/cv/SectHd';
import { EmptyState, ErrorView, LoadingState } from '@/components/cv/ListState';
import { colors } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import { fetchInventory, fetchOripaBoxes, type OripaBox } from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';
import { issueOripaPass } from '@/lib/oripaPass';

export default function OripaListScreen() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const { data, loading, error, refresh } = useAsync(fetchOripaBoxes);
  const [buying, setBuying] = useState<OripaBox | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: tc.paper }}>
      <AppBar onBack={() => router.back()} title="오리파" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}>
        <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
          <PixelFrame bg={tc.pur} borderWidth={3} shadow={5} hi={tc.purLt} lo={tc.purDk} inner={3}>
            <View style={{ padding: 14 }}>
              <PixelText variant={txt} size={12} color={tc.white} style={{ letterSpacing: 1 }}>🎲 포인트 뽑기</PixelText>
              <PixelText variant="ko" size={9} color={tc.white} style={{ marginTop: 8, lineHeight: 16, opacity: 0.9 }}>
                박스를 선택해 수량을 고른 뒤 구매하면 바로 뽑기로 이동합니다.{'\n'}이미 뽑힌 티켓은 등급이 공개되고, 남은 티켓은 뒷면으로 숨겨져 있어요.
              </PixelText>
            </View>
          </PixelFrame>
        </View>

        <View style={{ marginHorizontal: 14 }}>
          {loading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorView error={error} onRetry={refresh} />
          ) : !data || data.length === 0 ? (
            <EmptyState icon="📦" title="활성 박스가 없어요" desc="운영팀이 박스를 등록하면 이 자리에 표시됩니다." />
          ) : (
            <>
              <SectHd title={`뽑기 박스 · ${data.length}종`} />
              <View style={{ gap: 10 }}>
                {data.map((b) => (
                  <BoxCard key={b.id} box={b} onBuy={() => setBuying(b)} />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {buying ? <PurchaseModal box={buying} onClose={() => setBuying(null)} /> : null}
    </View>
  );
}

/* ── 구매 모달 — 웹 OripaPurchaseModal 동일: 1/5/10회(0·5·10% 할인), 포인트 부족 체크,
      결제는 서버 /pull 트랜잭션에서 차감 — 여기선 입장 토큰만 발급 후 플레이로 이동. ── */

const PACKS = [
  { count: 1, discount: 0, label: '1회' },
  { count: 5, discount: 0.05, label: '5회' },
  { count: 10, discount: 0.1, label: '10회' },
] as const;

function PurchaseModal({ box, onClose }: { box: OripaBox; onClose: () => void }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const [selected, setSelected] = useState(0);
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchInventory()
      .then((r) => alive && setPoints(r.inventory.points))
      .catch(() => alive && setPoints(0));
    return () => {
      alive = false;
    };
  }, []);

  const pack = PACKS[selected];
  const subtotal = box.price * pack.count;
  const discount = Math.floor(subtotal * pack.discount);
  const total = subtotal - discount;
  const insufficient = points != null && points < total;

  const buy = () => {
    if (insufficient) return;
    issueOripaPass(box.id, pack.count);
    onClose();
    router.push(`/oripa/${box.id}?qty=${pack.count}` as never);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 340 }}>
          <PixelFrame bg={tc.paper} borderWidth={3} shadow={6} inner={3}>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <PixelText variant={txt} size={12} weight="bold" color={tc.ink}>뽑기 구매</PixelText>
                <Pressable onPress={onClose} hitSlop={8}>
                  <PixelText variant={txt} size={13} color={tc.ink3}>✕</PixelText>
                </Pressable>
              </View>

              {/* 박스 요약 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: tc.pap2, borderColor: tc.ink, borderWidth: 2, padding: 10 }}>
                <PixelText variant={txt} size={24}>{box.emoji}</PixelText>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PixelText variant="ko" size={11} weight="bold" color={tc.ink} numberOfLines={1}>{box.name}</PixelText>
                  <PixelText variant="ko" size={9} color={tc.ink3} numberOfLines={2} style={{ marginTop: 3 }}>{box.desc}</PixelText>
                </View>
              </View>

              {/* 수량 선택 */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PACKS.map((p, i) => {
                  const on = selected === i;
                  return (
                    <Pressable
                      key={p.count}
                      onPress={() => setSelected(i)}
                      style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: on ? tc.ink : tc.white, borderColor: tc.ink, borderWidth: 2 }}
                    >
                      <PixelText variant={txt} size={10} color={on ? tc.gold : tc.ink}>{p.label}</PixelText>
                      {p.discount > 0 ? (
                        <PixelText variant={txt} size={7} color={on ? tc.white : tc.red} style={{ marginTop: 3 }}>
                          -{Math.round(p.discount * 100)}%
                        </PixelText>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* 금액 */}
              <View style={{ gap: 4 }}>
                <Row label="소계" value={`${subtotal.toLocaleString('ko-KR')}P`} tc={tc} txt={txt} />
                {discount > 0 ? <Row label="할인" value={`-${discount.toLocaleString('ko-KR')}P`} tc={tc} txt={txt} accent /> : null}
                <Row label="결제 포인트" value={`${total.toLocaleString('ko-KR')}P`} tc={tc} txt={txt} bold />
                <Row label="보유 포인트" value={points == null ? '…' : `🪙 ${points.toLocaleString('ko-KR')}P`} tc={tc} txt={txt} />
              </View>

              {insufficient ? (
                <View style={{ backgroundColor: tc.pap2, padding: 8, alignItems: 'center' }}>
                  <PixelText variant={txt} size={9} color={tc.red}>포인트가 부족해요</PixelText>
                </View>
              ) : null}

              <Pressable
                onPress={buy}
                disabled={insufficient || points == null}
                style={{ backgroundColor: insufficient ? tc.pap3 : tc.red, borderColor: tc.ink, borderWidth: 2, paddingVertical: 13, alignItems: 'center', opacity: points == null ? 0.6 : 1 }}
              >
                <PixelText variant={txt} size={11} color={insufficient ? tc.ink3 : tc.white}>
                  ▶ {pack.count}장 구매하고 뽑기 ▶
                </PixelText>
              </Pressable>
              <PixelText variant={txt} size={8} color={tc.ink3} style={{ textAlign: 'center' }}>
                포인트는 뽑기 시점에 차감됩니다
              </PixelText>
            </View>
          </PixelFrame>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ label, value, tc, txt, bold, accent }: { label: string; value: string; tc: ReturnType<typeof useThemeColors>; txt: 'pixel' | 'ko'; bold?: boolean; accent?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <PixelText variant={txt} size={9} color={tc.ink3}>{label}</PixelText>
      <PixelText variant={txt} size={bold ? 11 : 9} weight={bold ? 'bold' : 'normal'} color={accent ? tc.red : tc.ink}>{value}</PixelText>
    </View>
  );
}

const TIER_STYLE: Record<OripaBox['tier'], { bg: string; hi: string; lo: string; label: string }> = {
  normal: { bg: colors.white, hi: 'rgba(255,255,255,0.7)', lo: 'rgba(0,0,0,0.18)', label: 'NORMAL' },
  rare: { bg: colors.bluLt, hi: colors.bluLt, lo: colors.bluDk, label: 'RARE' },
  legend: { bg: colors.gold, hi: colors.goldLt, lo: colors.goldDk, label: 'LEGEND' },
};

function BoxCard({ box, onBuy }: { box: OripaBox; onBuy: () => void }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const t = TIER_STYLE[box.tier];
  const remaining = box.stats?.remaining ?? 0;
  const total = box.stats?.total ?? 0;
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 100;
  return (
    <PixelPress
      onPress={onBuy}
      bg={t.bg}
      hi={t.hi}
      lo={t.lo}
      borderWidth={3}
      shadow={5}
      inner={2}
    >
      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderColor: tc.ink, borderWidth: 2 }}>
            <PixelText variant={txt} size={28} color={tc.ink}>{box.emoji}</PixelText>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PixelText variant="ko" size={12} weight="bold" color={tc.ink} numberOfLines={1} style={{ flex: 1 }}>
                {box.name}
              </PixelText>
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: tc.ink, borderColor: tc.ink, borderWidth: 1 }}>
                <PixelText variant={txt} size={7} color={tc.gold}>{t.label}</PixelText>
              </View>
            </View>
            <PixelText variant="ko" size={9} color={tc.ink2} style={{ marginTop: 4 }} numberOfLines={2}>
              {box.desc}
            </PixelText>
          </View>
        </View>

        <View style={{ paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.5)', borderColor: tc.ink, borderWidth: 1 }}>
          <PixelText variant={txt} size={8} color={tc.ink3}>{box.odds}</PixelText>
        </View>

        {box.stats ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ flex: 1, height: 8, backgroundColor: tc.ink, borderColor: tc.ink, borderWidth: 1 }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: tc.gold }} />
            </View>
            <PixelText variant={txt} size={8} color={tc.ink}>{remaining}/{total}</PixelText>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <PixelText variant={txt} size={10} color={tc.ink} weight="bold">🪙 {box.price.toLocaleString('ko-KR')}P / 회</PixelText>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: tc.red, borderColor: tc.ink, borderWidth: 2 }}>
            <PixelText variant={txt} size={9} color={tc.white}>▶ 뽑기 ▶</PixelText>
          </View>
        </View>
      </View>
    </PixelPress>
  );
}
