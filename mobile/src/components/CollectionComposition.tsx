/**
 * 자산 구성(지역별 도넛) + 시리즈별 비중 TOP5 — 내 컬렉션 상단 분석 섹션.
 * 웹 CollectionScreen 의 composition / seriesTop 로직을 그대로 옮긴 모바일 버전.
 * 평가액 = 현재가(싱글|PSA10) × 수량 기준 비중.
 */
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { space } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import type { MyCardRow } from '@/lib/myApi';

interface Props {
  cards: MyCardRow[];
  priceMode: 'single' | 'psa10';
  format: (jpy: number) => string;
}

interface Seg {
  key: string;
  label: string;
  color: string;
  val: number;
  pct: number;
}

/** 카드 한 장의 현재 평가액(엔). 웹 allRows.value 와 동일. */
function rowValue(c: MyCardRow, usePsa10: boolean): number {
  const psa10 = c.pricePsa10Jpy ?? 0;
  const single = c.priceSingleJpy ?? c.snkrdunkMinPriceJpy ?? 0;
  const cur = usePsa10 && psa10 > 0 ? psa10 : single;
  const qty = Math.max(1, c.qty ?? 1);
  return cur > 0 ? cur * qty : 0;
}

export function CollectionComposition({ cards, priceMode, format }: Props) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const usePsa10 = priceMode === 'psa10';

  // 자산 구성 — 지역(에디션)별 평가액 비중.
  const composition = useMemo<Seg[]>(() => {
    const REGIONS: Array<{ key: string; label: string; color: string }> = [
      { key: 'jp', label: '일본판', color: tc.pur },
      { key: 'kr', label: '한국판', color: tc.blu },
      { key: 'en', label: '영문판', color: tc.gold },
      { key: 'etc', label: '미지정', color: tc.ink3 },
    ];
    const sums = new Map<string, number>();
    let total = 0;
    for (const c of cards) {
      const val = rowValue(c, usePsa10);
      if (val <= 0) continue;
      // 명시 지역 우선. 미지정이라도 스니덩크(일본 마켓) 출처면 일본판으로 간주.
      const key =
        c.region === 'jp' || c.region === 'kr' || c.region === 'en'
          ? c.region
          : c.snkrdunkApparelId
            ? 'jp'
            : 'etc';
      sums.set(key, (sums.get(key) ?? 0) + val);
      total += val;
    }
    if (total <= 0) return [];
    return REGIONS.map((reg) => ({
      ...reg,
      val: sums.get(reg.key) ?? 0,
      pct: ((sums.get(reg.key) ?? 0) / total) * 100,
    }))
      .filter((x) => x.val > 0)
      .sort((a, b) => b.val - a.val);
  }, [cards, usePsa10, tc]);

  // 시리즈별 비중 TOP 5 — 카탈로그 시리즈명 기준 평가액 비중.
  const seriesTop = useMemo(() => {
    const sums = new Map<string, number>();
    let total = 0;
    for (const c of cards) {
      const val = rowValue(c, usePsa10);
      if (val <= 0) continue;
      const name = c.series || '기타';
      sums.set(name, (sums.get(name) ?? 0) + val);
      total += val;
    }
    if (total <= 0) return [];
    const arr = [...sums.entries()].map(([name, val]) => ({ name, val, pct: (val / total) * 100 }));
    arr.sort((a, b) => b.val - a.val);
    return arr.slice(0, 5);
  }, [cards, usePsa10]);

  if (composition.length === 0 && seriesTop.length === 0) return null;

  const rankColors = [tc.pur, tc.blu, tc.gold, tc.purLt, tc.bluLt];

  return (
    <View style={{ paddingHorizontal: space.gap, marginBottom: space.cg }}>
      <PixelText variant="ko" size={15} weight="bold" color={tc.ink} style={{ marginBottom: 10 }}>
        자산 구성
      </PixelText>
      <PixelFrame shadow={5} inner={3}>
        <View style={{ padding: 16 }}>
          {composition.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Donut segments={composition} track={tc.pap3} />
              <View style={{ flex: 1, gap: 11 }}>
                {composition.map((c) => (
                  <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.color }} />
                    <PixelText variant="ko" size={12} weight="bold" color={tc.ink}>
                      {c.label}
                    </PixelText>
                    <PixelText variant={txt} size={12} weight="bold" color={tc.ink}>
                      {c.pct.toFixed(1)}%
                    </PixelText>
                    <PixelText variant={txt} size={10} color={tc.ink3} style={{ marginLeft: 'auto' }}>
                      {format(c.val)}
                    </PixelText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {seriesTop.length > 0 && (
            <>
              <PixelText
                variant="ko"
                size={12}
                weight="bold"
                color={tc.ink}
                style={{ marginTop: composition.length > 0 ? 20 : 0, marginBottom: 12 }}
              >
                시리즈별 비중 TOP {seriesTop.length}
              </PixelText>
              <View style={{ gap: 12 }}>
                {seriesTop.map((s, i) => (
                  <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                    <View
                      style={{
                        width: 21,
                        height: 21,
                        borderRadius: 11,
                        backgroundColor: rankColors[i] ?? tc.ink3,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PixelText variant={txt} size={10} weight="bold" color={tc.white}>
                        {i + 1}
                      </PixelText>
                    </View>
                    <PixelText variant="ko" size={12} weight="bold" color={tc.ink} numberOfLines={1} style={{ flex: 1 }}>
                      {s.name}
                    </PixelText>
                    <PixelText variant={txt} size={12} weight="bold" color={tc.ink}>
                      {s.pct.toFixed(1)}%
                    </PixelText>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </PixelFrame>
    </View>
  );
}

/** 자산 구성 도넛 — segments[].pct 합이 100 가정(아니어도 비율대로). */
function Donut({ segments, track }: { segments: Seg[]; track: string }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <Svg width={104} height={104} viewBox="0 0 118 118">
      <Circle cx={59} cy={59} r={R} fill="none" stroke={track} strokeWidth={15} />
      <G rotation={-90} origin="59, 59">
        {segments.map((s) => {
          const len = (s.pct / 100) * C;
          const off = -(acc / 100) * C;
          acc += s.pct;
          return (
            <Circle
              key={s.key}
              cx={59}
              cy={59}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={15}
              strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`}
              strokeDashoffset={off.toFixed(2)}
            />
          );
        })}
      </G>
    </Svg>
  );
}
