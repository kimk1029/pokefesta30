import { useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { SectHd } from '@/components/cv/SectHd';
import { SnkrdunkPriceChart } from '@/components/cv/SnkrdunkPriceChart';
import { colors } from '@/theme/tokens';
import {
  downsamplePricePoints,
  fetchSnkrdunkApparel,
  fetchSnkrdunkSalesChart,
  fetchSnkrdunkSalesHistory,
  localizeSnkrdunkText,
  priceDownsampleUnit,
  priceUnitLabelKo,
  snkrdunkApparelUrl,
  SNKRDUNK_FEATURED_CARDS,
  type SnkrdunkApparel,
  type SnkrdunkSalesChart,
  type SnkrdunkSalesHistory,
} from '@/services/snkrdunk';

function fmtYen(n: number): string {
  if (!n) return '—';
  return `¥${n.toLocaleString('ja-JP')}`;
}

/**
 * PSA10 / 무등급(non-PSA) 의 최근 5건 평균을 계산.
 * 입력은 API 응답 순서(보통 최신순) 그대로 — condition 우선, 없으면 label 로 판정.
 */
function pickRecentAverage(
  history: ReadonlyArray<{ price: number; condition?: string; label?: string }>,
  predicate: (badge: string) => boolean,
  limit = 5,
): { avg: number; count: number } {
  const picked: number[] = [];
  for (const h of history) {
    const badge = (h.condition || h.label || '').trim();
    if (!predicate(badge)) continue;
    if (typeof h.price !== 'number' || h.price <= 0) continue;
    picked.push(h.price);
    if (picked.length >= limit) break;
  }
  if (picked.length === 0) return { avg: 0, count: 0 };
  const sum = picked.reduce((a, b) => a + b, 0);
  return { avg: Math.round(sum / picked.length), count: picked.length };
}

const PSA_GRADE_RE = /PSA\s*\d+/i;
const PSA10_RE = /PSA\s*10\b/i;

export default function SnkrdunkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const apparelId = Number(id);
  const seed = SNKRDUNK_FEATURED_CARDS.find((c) => c.apparelId === apparelId);

  const [apparel, setApparel] = useState<SnkrdunkApparel | null>(null);
  const [history, setHistory] = useState<SnkrdunkSalesHistory | null>(null);
  const [chart, setChart] = useState<SnkrdunkSalesChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(apparelId) || apparelId <= 0) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      const [a, h, c] = await Promise.all([
        fetchSnkrdunkApparel(apparelId),
        fetchSnkrdunkSalesHistory(apparelId),
        fetchSnkrdunkSalesChart(apparelId),
      ]);
      if (!alive) return;
      setApparel(a);
      setHistory(h);
      setChart(c);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [apparelId]);

  const displayName = seed?.shortName ?? apparel?.localizedName ?? '카드 정보';
  const allPoints = chart?.points ?? [];
  const downsampleUnit = priceDownsampleUnit(allPoints);
  const points = downsamplePricePoints(allPoints);
  const unitLabel =
    downsampleUnit === 'monthly' ? '월 평균' : downsampleUnit === 'weekly' ? '주 평균' : '거래 단위';
  const sectionMore =
    downsampleUnit === 'raw'
      ? `최근 ${points.length}건`
      : `${points.length}${priceUnitLabelKo(downsampleUnit)} 평균`;

  const historyList = history?.history ?? [];
  const rawAvg = pickRecentAverage(historyList, (b) => !PSA_GRADE_RE.test(b));
  const psa10Avg = pickRecentAverage(historyList, (b) => PSA10_RE.test(b));

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title="시세 상세" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <PixelText variant="pixel" size={10} color={colors.ink3}>
              불러오는 중...
            </PixelText>
          </View>
        ) : !apparel ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <PixelText variant="pixel" size={10} color={colors.ink3}>
              상품 정보를 가져오지 못했습니다.
            </PixelText>
          </View>
        ) : (
          <>
            {/* Hero card */}
            <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
              <PixelFrame bg={colors.white}>
                <View style={{ padding: 14, flexDirection: 'row', gap: 14 }}>
                  <Pressable
                    onPress={() => {
                      if (apparel.imageUrl) setZoomOpen(true);
                    }}
                    style={{
                      width: 88,
                      height: 88,
                      backgroundColor: colors.pap2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      borderColor: colors.ink,
                      borderWidth: 2,
                    }}
                  >
                    {apparel.imageUrl ? (
                      <Image
                        source={{ uri: apparel.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 28 }}>🃏</Text>
                    )}
                  </Pressable>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {seed ? (
                      <View
                        style={{
                          alignSelf: 'flex-start',
                          backgroundColor: colors.orn,
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                          borderColor: colors.ink,
                          borderWidth: 1,
                          marginBottom: 6,
                        }}
                      >
                        <PixelText variant="pixel" size={8} color={colors.white}>
                          {seed.category}
                        </PixelText>
                      </View>
                    ) : null}
                    <PixelText variant="pixel" size={10} numberOfLines={3} style={{ lineHeight: 14, marginBottom: 6 }}>
                      {displayName}
                    </PixelText>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                      <View style={{ flex: 1 }}>
                        <PixelText variant="pixel" size={7} color={colors.ink3} style={{ marginBottom: 2 }}>
                          {rawAvg.count > 0 ? `싱글 평균 (최근 ${rawAvg.count}건)` : '싱글 평균'}
                        </PixelText>
                        <PixelText variant="pixel" size={13} color={colors.red}>
                          {fmtYen(rawAvg.avg)}
                        </PixelText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <PixelText variant="pixel" size={7} color={colors.ink3} style={{ marginBottom: 2 }}>
                          {psa10Avg.count > 0 ? `PSA10 평균 (최근 ${psa10Avg.count}건)` : 'PSA10 평균'}
                        </PixelText>
                        <PixelText
                          variant="pixel"
                          size={13}
                          color={psa10Avg.avg > 0 ? colors.orn : colors.ink3}
                        >
                          {fmtYen(psa10Avg.avg)}
                        </PixelText>
                      </View>
                    </View>
                    <PixelText variant="pixel" size={8} color={colors.ink3} style={{ marginTop: 6 }}>
                      {`최저매물 ${fmtYen(apparel.minPrice)}`}
                      {apparel.listingCountText ? ` · 매물 ${apparel.listingCountText}건` : ''}
                    </PixelText>
                  </View>
                </View>
              </PixelFrame>
            </View>

            {/* Snkrdunk open button */}
            <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
              <PixelPress onPress={() => Linking.openURL(snkrdunkApparelUrl(apparelId))}>
                <View
                  style={{
                    backgroundColor: colors.ink,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <PixelText variant="pixel" size={11} color={colors.gold}>
                    🇯🇵 스니덩크에서 구매·확인 ↗
                  </PixelText>
                </View>
              </PixelPress>
            </View>

            {/* Chart */}
            <View style={{ marginHorizontal: 14 }}>
              <SectHd title="시세 차트" more={sectionMore} />
            </View>
            <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
              <PixelFrame bg={colors.white}>
                <View style={{ padding: 14 }}>
                  <SnkrdunkPriceChart points={points} unitLabel={unitLabel} rawCount={allPoints.length} />
                </View>
              </PixelFrame>
            </View>

            {/* Recent transactions — log style */}
            <View style={{ marginHorizontal: 14 }}>
              <SectHd
                title="최근 거래내역"
                more={`${history?.history.length ?? 0}건`}
              />
            </View>
            <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
              <PixelFrame bg={colors.ink2}>
                <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, overflow: 'hidden' }}>
                  {history && history.history.length > 0 ? (
                    history.history.slice(0, 20).map((h, i, arr) => {
                      const date = localizeSnkrdunkText(h.date);
                      const label = localizeSnkrdunkText(h.label);
                      const condition = h.condition;
                      const badge = condition || label || '일반';
                      const isPsa = /PSA\s*\d+/i.test(badge);
                      return (
                        <View
                          key={i}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 6,
                            borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                            borderBottomColor: 'rgba(255,255,255,0.08)',
                          }}
                        >
                          <View
                            style={{
                              minWidth: 56,
                              paddingHorizontal: 5,
                              paddingVertical: 2,
                              backgroundColor: isPsa ? colors.gold : 'rgba(255,255,255,0.12)',
                              borderColor: isPsa ? colors.ink : 'rgba(255,255,255,0.18)',
                              borderWidth: 1,
                              marginRight: 8,
                              alignItems: 'center',
                            }}
                          >
                            <PixelText variant="pixel" size={8} color={isPsa ? colors.ink : colors.white}>
                              {badge}
                            </PixelText>
                          </View>
                          <PixelText
                            variant="pixel"
                            size={10}
                            color={colors.gold}
                            numberOfLines={1}
                            style={{ flex: 1 }}
                          >
                            {fmtYen(h.price)}
                          </PixelText>
                          <PixelText variant="pixel" size={8} color="rgba(255,255,255,0.55)">
                            {date}
                          </PixelText>
                        </View>
                      );
                    })
                  ) : (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.55)">
                        거래내역이 없습니다
                      </PixelText>
                    </View>
                  )}
                </View>
              </PixelFrame>
            </View>

            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <PixelText variant="pixel" size={8} color={colors.ink3}>
                데이터 출처: snkrdunk.com
              </PixelText>
            </View>
          </>
        )}
      </ScrollView>
      <Modal
        visible={zoomOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomOpen(false)}
      >
        <Pressable
          onPress={() => setZoomOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          {apparel?.imageUrl ? (
            <Image
              source={{ uri: apparel.imageUrl }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          ) : null}
          <View style={{ position: 'absolute', top: 40, right: 20, backgroundColor: colors.ink, paddingHorizontal: 10, paddingVertical: 6, borderColor: colors.gold, borderWidth: 2 }}>
            <PixelText variant="pixel" size={11} color={colors.gold}>✕ 닫기</PixelText>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
