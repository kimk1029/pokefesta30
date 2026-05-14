import React, { useEffect, useState } from 'react';
import { Image, Linking, ScrollView, View, Text } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { SectHd } from '@/components/cv/SectHd';
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

function fmtDateShort(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${yy}.${m}.${day}`;
}

function fmtYenCompact(n: number): string {
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `¥${Math.round(n / 1000)}K`;
  return `¥${n.toLocaleString('en-US')}`;
}

function niceTicks(min: number, max: number, n = 4): number[] {
  if (!(max > min)) return [min];
  const range = max - min;
  const rough = range / (n - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(v);
  return out;
}

function Chart({
  points,
  unitLabel,
  rawCount,
  width = 320,
  height = 180,
}: {
  points: Array<[number, number]>;
  unitLabel: string;
  rawCount: number;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pap2 }}>
        <PixelText variant="pixel" size={9} color={colors.ink3}>
          시세 이력이 부족합니다
        </PixelText>
      </View>
    );
  }
  const PAD_L = 50;
  const PAD_R = 10;
  const PAD_T = 14;
  const PAD_B = 28;
  const innerW = width - PAD_L - PAD_R;
  const innerH = height - PAD_T - PAD_B;

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const dataMinY = Math.min(...ys);
  const dataMaxY = Math.max(...ys);
  const yTicks = niceTicks(dataMinY, dataMaxY, 4);
  const minY = yTicks[0];
  const maxY = yTicks[yTicks.length - 1];
  const rangeY = maxY - minY || 1;
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const rangeX = maxX - minX || 1;
  const xOf = (v: number) => PAD_L + ((v - minX) / rangeX) * innerW;
  const yOf = (v: number) => PAD_T + (1 - (v - minY) / rangeY) * innerH;
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p[0]).toFixed(1)},${yOf(p[1]).toFixed(1)}`)
    .join(' ');
  const areaPath =
    linePath +
    ` L${xOf(maxX).toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${xOf(minX).toFixed(1)},${(
      PAD_T + innerH
    ).toFixed(1)} Z`;
  const trendUp = ys[ys.length - 1] >= ys[0];
  const lineColor = trendUp ? colors.red : colors.blu;
  const areaColor = trendUp ? 'rgba(230,57,70,0.18)' : 'rgba(58,91,217,0.18)';
  const xTickValues = [0, 1 / 3, 2 / 3, 1].map((t) => minX + t * rangeX);

  return (
    <View>
      <View style={{ width: '100%', backgroundColor: colors.pap2 }}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Y grid + labels */}
          {yTicks.map((v) => {
            const y = yOf(v);
            return (
              <React.Fragment key={`y-${v}`}>
                <Line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
                <SvgText x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize={7} fill={colors.ink3}>
                  {fmtYenCompact(v)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* X labels */}
          {xTickValues.map((tv, i) => {
            const x = xOf(tv);
            return (
              <React.Fragment key={`x-${i}`}>
                <Line
                  x1={x}
                  y1={PAD_T + innerH}
                  x2={x}
                  y2={PAD_T + innerH + 3}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={1}
                />
                <SvgText
                  x={x}
                  y={PAD_T + innerH + 12}
                  textAnchor={i === 0 ? 'start' : i === xTickValues.length - 1 ? 'end' : 'middle'}
                  fontSize={7}
                  fill={colors.ink3}
                >
                  {fmtDateShort(tv)}
                </SvgText>
              </React.Fragment>
            );
          })}

          <Path d={areaPath} fill={areaColor} />
          <Path d={linePath} stroke={lineColor} strokeWidth={1.5} fill="none" />
          <Circle cx={xOf(maxX)} cy={yOf(ys[ys.length - 1])} r={3} fill={lineColor} />

          <SvgText x={PAD_L} y={PAD_T - 4} textAnchor="start" fontSize={7} fill={colors.ink3}>
            가격 (JPY)
          </SvgText>
          <SvgText x={width - PAD_R} y={height - 4} textAnchor="end" fontSize={7} fill={colors.ink3}>
            거래일
          </SvgText>
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <PixelText variant="pixel" size={8} color={colors.ink3}>
          기간: {fmtDateShort(minX)} ~ {fmtDateShort(maxX)} · {unitLabel} · 거래 {rawCount}건
        </PixelText>
        <PixelText variant="pixel" size={8} color={colors.ink3}>
          최저 ¥{dataMinY.toLocaleString('ja-JP')} · 최고 ¥{dataMaxY.toLocaleString('ja-JP')}
        </PixelText>
      </View>
    </View>
  );
}

export default function SnkrdunkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const apparelId = Number(id);
  const seed = SNKRDUNK_FEATURED_CARDS.find((c) => c.apparelId === apparelId);

  const [apparel, setApparel] = useState<SnkrdunkApparel | null>(null);
  const [history, setHistory] = useState<SnkrdunkSalesHistory | null>(null);
  const [chart, setChart] = useState<SnkrdunkSalesChart | null>(null);
  const [loading, setLoading] = useState(true);

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
                  <View
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
                  </View>
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
                    <PixelText variant="pixel" size={14} color={colors.red}>
                      {fmtYen(apparel.minPrice)}
                    </PixelText>
                    {apparel.listingCountText ? (
                      <PixelText variant="pixel" size={8} color={colors.ink3} style={{ marginTop: 4 }}>
                        매물 {apparel.listingCountText}건
                      </PixelText>
                    ) : null}
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
                    🇯🇵 스니다에서 구매·확인 ↗
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
                  <Chart points={points} unitLabel={unitLabel} rawCount={allPoints.length} />
                </View>
              </PixelFrame>
            </View>

            {/* Recent transactions */}
            <View style={{ marginHorizontal: 14 }}>
              <SectHd
                title="최근 거래내역"
                more={`${history?.history.length ?? 0}건`}
              />
            </View>
            <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
              <PixelFrame bg={colors.white}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
                  {history && history.history.length > 0 ? (
                    history.history.slice(0, 20).map((h, i, arr) => {
                      const date = localizeSnkrdunkText(h.date);
                      const size = localizeSnkrdunkText(h.size);
                      const label = localizeSnkrdunkText(h.label);
                      const condition = h.condition;
                      const subParts = [label, size, condition].filter(Boolean);
                      const condBadge = condition || label;
                      return (
                        <View
                          key={i}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 10,
                            borderBottomWidth: i < arr.length - 1 ? 2 : 0,
                            borderBottomColor: colors.pap3,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <PixelText variant="pixel" size={11} color={colors.ink}>
                              {fmtYen(h.price)}
                            </PixelText>
                            <PixelText variant="pixel" size={8} color={colors.ink3} style={{ marginTop: 3 }}>
                              {date}
                              {subParts.length ? ` · ${subParts.join(' · ')}` : ''}
                            </PixelText>
                          </View>
                          {condBadge ? (
                            <View
                              style={{
                                backgroundColor: colors.pap2,
                                paddingHorizontal: 6,
                                paddingVertical: 3,
                                borderColor: colors.ink,
                                borderWidth: 1,
                                marginLeft: 8,
                              }}
                            >
                              <PixelText variant="pixel" size={8} color={colors.ink}>
                                {condBadge}
                              </PixelText>
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  ) : (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <PixelText variant="pixel" size={9} color={colors.ink3}>
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
    </View>
  );
}
