import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, ToastAndroid, View, Platform, Text, type ImageSourcePropType } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { addCards } from '@/lib/collection';
import { isAuthenticated } from '@/lib/session';

function toast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('알림', msg);
  }
}
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
import { localizeCardName } from '@/lib/cardNameKo';

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

  const displayName = seed?.shortName ?? localizeCardName(apparel?.localizedName) ?? '카드 정보';
  const displayNameKo = localizeCardName(displayName);
  const originalJp = apparel?.localizedName ?? '';
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
                    <PixelText variant="ko" size={11} weight="bold" numberOfLines={2} style={{ lineHeight: 15, marginBottom: 3 }}>
                      {displayNameKo}
                    </PixelText>
                    {originalJp && originalJp !== displayNameKo ? (
                      <PixelText variant="pixel" size={7} color={colors.ink3} numberOfLines={1} style={{ marginBottom: 6 }}>
                        {originalJp}
                      </PixelText>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <PixelText variant="pixel" size={7} color={colors.ink3} style={{ marginBottom: 2 }} numberOfLines={1}>
                          {rawAvg.count > 0 ? `싱글 평균 (최근 ${rawAvg.count}건)` : '싱글 평균'}
                        </PixelText>
                        {/* numberOfLines=1 + adjustsFontSizeToFit → 줄바꿈은 절대 발생하지 않고,
                            컬럼 폭이 부족하면 폰트 크기만 축소된다. */}
                        <PixelText
                          variant="pixel"
                          size={13}
                          color={colors.red}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.5}
                        >
                          {fmtYen(rawAvg.avg)}
                        </PixelText>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <PixelText variant="pixel" size={7} color={colors.ink3} style={{ marginBottom: 2 }} numberOfLines={1}>
                          {psa10Avg.count > 0 ? `PSA10 평균 (최근 ${psa10Avg.count}건)` : 'PSA10 평균'}
                        </PixelText>
                        <PixelText
                          variant="pixel"
                          size={13}
                          color={psa10Avg.avg > 0 ? colors.orn : colors.ink3}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.5}
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

            {/* 액션 버튼 3개 — 내 컬렉션 / 관심카드 / SNKDUNK 외부 링크 */}
            <View
              style={{
                flexDirection: 'row',
                marginHorizontal: 14,
                marginBottom: 12,
                gap: 8,
              }}
            >
              <ActionBtn
                bg={colors.blu}
                fg={colors.white}
                icon="📦"
                label="내 컬렉션"
                desc="추가"
                onPress={() => {
                  if (!isAuthenticated()) {
                    toast('로그인이 필요합니다');
                    return;
                  }
                  if (!apparel) {
                    toast('카드 정보 로딩 중');
                    return;
                  }
                  const price = apparel.minPrice ?? 0;
                  addCards([
                    {
                      id: Date.now(),
                      name: displayNameKo || displayName || '카드',
                      set: '—',
                      num: String(apparel.id),
                      game: '포켓몬' as const,
                      rar: 'C' as const,
                      grade: null,
                      price,
                      priceSingle: price,
                      priceCurrency: 'JPY' as const,
                      trend: [],
                      emoji: '🃏',
                      owned: true,
                      imageUrl: apparel.imageUrl ?? undefined,
                      snkrdunkApparelId: apparel.id,
                      favorite: false,
                    },
                  ]);
                  toast('내 컬렉션에 추가되었습니다');
                }}
              />
              <ActionBtn
                bg={colors.pur}
                fg={colors.white}
                icon="⭐"
                label="관심카드"
                desc="추가"
                onPress={() => {
                  if (!isAuthenticated()) {
                    toast('로그인이 필요합니다');
                    return;
                  }
                  if (!apparel) {
                    toast('카드 정보 로딩 중');
                    return;
                  }
                  const price = apparel.minPrice ?? 0;
                  addCards([
                    {
                      id: Date.now(),
                      name: displayNameKo || displayName || '카드',
                      set: '—',
                      num: String(apparel.id),
                      game: '포켓몬' as const,
                      rar: 'C' as const,
                      grade: null,
                      price,
                      priceSingle: price,
                      priceCurrency: 'JPY' as const,
                      trend: [],
                      emoji: '🃏',
                      owned: false,
                      imageUrl: apparel.imageUrl ?? undefined,
                      snkrdunkApparelId: apparel.id,
                      favorite: true,
                    },
                  ]);
                  toast('관심카드에 추가되었습니다');
                  router.push('/my/favorites' as never);
                }}
              />
              <ActionBtn
                bg={colors.ink}
                fg={colors.gold}
                iconImage={require('../../../assets/snkrdunk-icon.png')}
                label="SNKDUNK"
                desc="↗"
                onPress={() => Linking.openURL(snkrdunkApparelUrl(apparelId))}
              />
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

interface ActionBtnProps {
  bg: string;
  fg: string;
  /** 이모지 아이콘. iconImage 가 주어지면 그쪽이 우선. */
  icon?: string;
  /** PNG/WebP 이미지 아이콘 (require 결과). */
  iconImage?: ImageSourcePropType;
  label: string;
  desc: string;
  onPress: () => void;
}

/**
 * 시세 상세 하단 3-버튼.
 * 디자인 변경: 세로 적층(아이콘/라벨/desc) → 가로 한 줄 압축 레이아웃.
 * 이전 paddingVertical=10 + 3줄 텍스트 → paddingVertical=5 + 단일 행
 * 으로 버튼 높이가 약 절반으로 줄어듦.
 */
function ActionBtn({ bg, fg, icon, iconImage, label, desc, onPress }: ActionBtnProps) {
  return (
    <View style={{ flex: 1 }}>
      <PixelPress onPress={onPress} bg={bg} borderWidth={3} shadow={5} hi="rgba(255,255,255,0.35)" lo="rgba(0,0,0,0.25)" inner={0}>
        <View
          style={{
            paddingVertical: 5,
            paddingHorizontal: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}
        >
          {iconImage ? (
            <Image
              source={iconImage}
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
          ) : icon ? (
            <Text style={{ fontSize: 14 }}>{icon}</Text>
          ) : null}
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <PixelText
              variant="ko"
              size={9}
              weight="bold"
              color={fg}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {label}
            </PixelText>
          </View>
          {desc ? (
            <PixelText
              variant="pixel"
              size={8}
              color={fg}
              style={{ opacity: 0.7, letterSpacing: 0.2 }}
              numberOfLines={1}
            >
              {desc}
            </PixelText>
          ) : null}
        </View>
      </PixelPress>
    </View>
  );
}
