/**
 * /my/oripa — 오리파 박스 목록.
 * GET /api/oripa 로 활성 박스를 가져온다. 박스 탭 시 /oripa/[id] 로 이동.
 */
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { SectHd } from '@/components/cv/SectHd';
import { EmptyState, ErrorView, LoadingState } from '@/components/cv/ListState';
import { colors } from '@/theme/tokens';
import { fetchOripaBoxes, type OripaBox } from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';

export default function OripaListScreen() {
  const { data, loading, error, refresh } = useAsync(fetchOripaBoxes);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title="오리파" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}>
        <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
          <PixelFrame bg={colors.pur} borderWidth={3} shadow={5} hi={colors.purLt} lo={colors.purDk} inner={3}>
            <View style={{ padding: 14 }}>
              <PixelText variant="pixel" size={12} color={colors.white} style={{ letterSpacing: 1 }}>🎲 포인트 뽑기</PixelText>
              <PixelText variant="ko" size={9} color={colors.white} style={{ marginTop: 8, lineHeight: 16, opacity: 0.9 }}>
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
                  <BoxCard key={b.id} box={b} />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const TIER_STYLE: Record<OripaBox['tier'], { bg: string; hi: string; lo: string; label: string }> = {
  normal: { bg: colors.white, hi: 'rgba(255,255,255,0.7)', lo: 'rgba(0,0,0,0.18)', label: 'NORMAL' },
  rare: { bg: colors.bluLt, hi: colors.bluLt, lo: colors.bluDk, label: 'RARE' },
  legend: { bg: colors.gold, hi: colors.goldLt, lo: colors.goldDk, label: 'LEGEND' },
};

function BoxCard({ box }: { box: OripaBox }) {
  const t = TIER_STYLE[box.tier];
  const remaining = box.stats?.remaining ?? 0;
  const total = box.stats?.total ?? 0;
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 100;
  return (
    <PixelPress
      onPress={() => router.push(`/oripa/${box.id}` as never)}
      bg={t.bg}
      hi={t.hi}
      lo={t.lo}
      borderWidth={3}
      shadow={5}
      inner={2}
    >
      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderColor: colors.ink, borderWidth: 2 }}>
            <PixelText variant="pixel" size={28} color={colors.ink}>{box.emoji}</PixelText>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PixelText variant="ko" size={12} weight="bold" color={colors.ink} numberOfLines={1} style={{ flex: 1 }}>
                {box.name}
              </PixelText>
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.ink, borderColor: colors.ink, borderWidth: 1 }}>
                <PixelText variant="pixel" size={7} color={colors.gold}>{t.label}</PixelText>
              </View>
            </View>
            <PixelText variant="ko" size={9} color={colors.ink2} style={{ marginTop: 4 }} numberOfLines={2}>
              {box.desc}
            </PixelText>
          </View>
        </View>

        <View style={{ paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.5)', borderColor: colors.ink, borderWidth: 1 }}>
          <PixelText variant="pixel" size={8} color={colors.ink3}>{box.odds}</PixelText>
        </View>

        {box.stats ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ flex: 1, height: 8, backgroundColor: colors.ink, borderColor: colors.ink, borderWidth: 1 }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.gold }} />
            </View>
            <PixelText variant="pixel" size={8} color={colors.ink}>{remaining}/{total}</PixelText>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <PixelText variant="pixel" size={10} color={colors.ink} weight="bold">🪙 {box.price.toLocaleString('ko-KR')}P / 회</PixelText>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.red, borderColor: colors.ink, borderWidth: 2 }}>
            <PixelText variant="pixel" size={9} color={colors.white}>▶ 뽑기 ▶</PixelText>
          </View>
        </View>
      </View>
    </PixelPress>
  );
}
