/**
 * 시세 비교 — SNKRDUNK(엔화) vs KREAM(원화)를 원화로 환산해 나란히 보여준다.
 * 웹 src/components/cards/KreamCompare.tsx 의 모바일 포팅.
 * KREAM 은 이름으로 검색(NAS 스크래핑·캐시)해 최적 매칭의 즉시판매가만 비교. 실패 시 폴백 링크.
 */
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { SectHd } from '@/components/cv/SectHd';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { api } from '@/lib/apiClient';

interface KreamItem {
  id: string;
  name: string;
  price: number; // KRW
  imageUrl: string | null;
  productUrl: string;
}

function fmtKrw(v: number): string {
  if (!v || v <= 0) return '—';
  return `₩${Math.round(v).toLocaleString('ko-KR')}`;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/** 검색 결과에서 카드명과 가장 잘 맞는 항목 선택(토큰 포함 수). 없으면 첫 결과. */
function bestMatch(items: KreamItem[], query: string): KreamItem | null {
  if (items.length === 0) return null;
  const tokens = query.split(/\s+/).filter((t) => t.length >= 2);
  let best = items[0];
  let bestScore = -1;
  for (const it of items) {
    const n = norm(it.name);
    let score = 0;
    for (const t of tokens) if (n.includes(norm(t))) score += 1;
    if (it.price > 0) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return best;
}

export function KreamCompare({ query, snkrPriceJpy }: { query: string; snkrPriceJpy: number }) {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const { rate } = useCurrency();
  const [state, setState] = useState<'loading' | 'done'>('loading');
  const [item, setItem] = useState<KreamItem | null>(null);

  useEffect(() => {
    if (!query) {
      setState('done');
      return;
    }
    let alive = true;
    setState('loading');
    (async () => {
      try {
        const j = await api<{ items?: KreamItem[] }>(`/api/kream/search?q=${encodeURIComponent(query)}`, { auth: false });
        if (!alive) return;
        setItem(bestMatch(j.items ?? [], query));
      } catch {
        if (alive) setItem(null);
      } finally {
        if (alive) setState('done');
      }
    })();
    return () => {
      alive = false;
    };
  }, [query]);

  const searchUrl = `https://kream.co.kr/search?keyword=${encodeURIComponent(query)}`;
  const snkrKrw = snkrPriceJpy > 0 ? snkrPriceJpy * rate : 0;
  const kreamKrw = item?.price ?? 0;

  const cmp = useMemo(() => {
    if (snkrKrw <= 0 || kreamKrw <= 0) return null;
    const diff = kreamKrw - snkrKrw;
    const cheaper = diff > 0 ? 'snkr' : diff < 0 ? 'kream' : 'same';
    const pct = (Math.abs(diff) / Math.min(snkrKrw, kreamKrw)) * 100;
    return { diff, cheaper, pct };
  }, [snkrKrw, kreamKrw]);

  return (
    <>
      <View style={{ marginHorizontal: 14 }}>
        <SectHd title="시세 비교" more="SNKRDUNK vs 크림" />
      </View>
      <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
        <PixelFrame bg={tc.white}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10 }}>
              <Col tc={tc} txt={txt} name="SNKRDUNK" sub="최근 거래가(엔화 환산)" price={fmtKrw(snkrKrw)} highlight={cmp?.cheaper === 'snkr'} />
              <View style={{ width: 1, backgroundColor: tc.pap3 }} />
              <Col
                tc={tc}
                txt={txt}
                name="크림 KREAM"
                sub="즉시판매가"
                price={state === 'loading' ? '조회 중…' : fmtKrw(kreamKrw)}
                highlight={cmp?.cheaper === 'kream'}
                onPress={item?.productUrl ? () => Linking.openURL(item.productUrl).catch(() => {}) : undefined}
              />
            </View>

            {cmp ? (
              <View style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: tc.pap2 }}>
                {cmp.cheaper === 'same' ? (
                  <PixelText variant={txt} size={11} weight="bold" color={tc.ink} style={{ textAlign: 'center' }}>
                    두 플랫폼 시세가 비슷해요
                  </PixelText>
                ) : (
                  <PixelText variant={txt} size={11} weight="bold" color={tc.ink} style={{ textAlign: 'center' }}>
                    <PixelText variant={txt} size={11} weight="bold" color={cmp.cheaper === 'snkr' ? tc.blu : tc.red}>
                      {cmp.cheaper === 'snkr' ? 'SNKRDUNK' : '크림'}
                    </PixelText>
                    {' 이 '}
                    <PixelText variant={txt} size={11} weight="bold" color={tc.red}>{fmtKrw(Math.abs(cmp.diff))}</PixelText>
                    {` 저렴 (${cmp.pct.toFixed(1)}%)`}
                  </PixelText>
                )}
              </View>
            ) : null}

            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <PixelText variant={txt} size={9} color={tc.ink3} numberOfLines={1} style={{ flex: 1 }}>
                {state === 'loading' ? '크림 시세 조회 중…' : item ? `크림 매칭: ${item.name}` : '크림에서 일치하는 상품을 찾지 못했어요'}
              </PixelText>
              <Pressable onPress={() => Linking.openURL(item?.productUrl ?? searchUrl).catch(() => {})} hitSlop={6}>
                <PixelText variant={txt} size={10} weight="bold" color={tc.blu}>크림에서 보기 ↗</PixelText>
              </Pressable>
            </View>
            <PixelText variant={txt} size={8} color={tc.ink3} style={{ marginTop: 8, lineHeight: 13 }}>
              · 이베이·메루카리·야후옥션 비교는 준비 중이에요.
            </PixelText>
          </View>
        </PixelFrame>
      </View>
    </>
  );
}

function Col({
  tc,
  txt,
  name,
  sub,
  price,
  highlight,
  onPress,
}: {
  tc: ReturnType<typeof useThemeColors>;
  txt: 'pixel' | 'ko';
  name: string;
  sub: string;
  price: string;
  highlight?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <PixelText variant={txt} size={11} weight="bold" color={tc.ink}>{name}</PixelText>
      <PixelText variant={txt} size={9} color={tc.ink3} style={{ marginTop: 3 }}>{sub}</PixelText>
      <PixelText variant={txt} size={16} weight="bold" color={highlight ? tc.red : tc.ink} numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 8 }}>
        {price}
      </PixelText>
      {highlight ? (
        <View style={{ alignSelf: 'flex-start', marginTop: 5, backgroundColor: tc.red, paddingHorizontal: 6, paddingVertical: 2 }}>
          <PixelText variant={txt} size={8} weight="bold" color={tc.white}>최저</PixelText>
        </View>
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable style={{ flex: 1, minWidth: 0 }} onPress={onPress}>{inner}</Pressable>
  ) : (
    <View style={{ flex: 1, minWidth: 0 }}>{inner}</View>
  );
}
