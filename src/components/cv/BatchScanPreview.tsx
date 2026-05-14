import { useEffect, useReducer, useRef } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { CardArt } from '@/components/cv/CardArt';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { uploadScanImage, CardScanError } from '@/services/cardScanApi';
import type { CardScanResponse, ScanLanguage } from '@/types/cardScan';
import { CARDS, type CardItem } from '@/data/cardvault';
import type { CapturedCard } from '@/components/cv/CardScanner';

interface Props {
  captures: CapturedCard[];
  useAi?: boolean;
  language?: ScanLanguage;
  onRetake: () => void;
  onConfirm: (cards: CardItem[]) => void;
}

type ItemPhase = 'analyzing' | 'done' | 'failed';

interface ItemState {
  phase: ItemPhase;
  scan?: CardScanResponse;
  error?: string;
}

type Action =
  | { type: 'scan-ok'; index: number; scan: CardScanResponse }
  | { type: 'failed'; index: number; error: string };

function reducer(state: ItemState[], action: Action): ItemState[] {
  const next = state.slice();
  switch (action.type) {
    case 'scan-ok':
      // /scan now returns enriched candidates directly — no follow-up lookup
      // call. Mark done as soon as the scan response arrives.
      next[action.index] = { ...next[action.index], scan: action.scan, phase: 'done' };
      return next;
    case 'failed':
      next[action.index] = { ...next[action.index], phase: 'failed', error: action.error };
      return next;
    default:
      return state;
  }
}

export function BatchScanPreview({ captures, useAi = true, language, onRetake, onConfirm }: Props) {
  const [items, dispatch] = useReducer(
    reducer,
    captures.map<ItemState>(() => ({ phase: 'analyzing' as ItemPhase })),
  );
  const startedRef = useRef(false);

  // Process all captures in parallel — server can handle concurrent OCR
  // requests, and waiting serially for N=10 cards would be unbearable.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    captures.forEach((cap, index) => {
      uploadScanImage({
        uri: cap.uri,
        guideRect: cap.meta.guideRect,
        imageWidth: cap.meta.imageWidth,
        imageHeight: cap.meta.imageHeight,
        capturedAt: cap.meta.capturedAt,
        useAi,
        language,
      })
        .then((res) => {
          dispatch({ type: 'scan-ok', index, scan: res });
        })
        .catch((e: unknown) => {
          const msg = e instanceof CardScanError ? e.message : '카드 인식 실패';
          dispatch({ type: 'failed', index, error: msg });
        });
    });
  }, [captures, useAi, language]);

  const total = captures.length;
  const doneCount = items.filter((it) => it.phase !== 'analyzing').length;
  const successCount = items.filter((it) => it.phase === 'done' && it.scan?.success).length;
  const allDone = doneCount === total;

  const handleConfirm = () => {
    const cards: CardItem[] = items
      .map((it, i) => itemToCard(it, captures[i]))
      .filter((c): c is CardItem => c !== null);
    onConfirm(cards);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 }}>
        <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
          <PixelFrame bg={colors.ink2} hi="rgba(255,255,255,0.08)" lo="rgba(0,0,0,0.5)">
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <PixelText variant="ko" size={12} weight="bold" color={colors.gold}>
                  {allDone ? '🎉 분석 완료' : '카드 일괄 분석 중...'}
                </PixelText>
                <PixelText variant="ko" size={10} color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }}>
                  {allDone
                    ? `${successCount}/${total}장 인식됨`
                    : `${doneCount}/${total}장 처리 중`}
                </PixelText>
              </View>
              {!allDone ? <ActivityIndicator color={colors.gold} /> : null}
            </View>
          </PixelFrame>
        </View>

        <View style={{ marginHorizontal: 14, gap: 10 }}>
          {captures.map((cap, i) => (
            <Row key={cap.uri} cap={cap} state={items[i]} index={i} />
          ))}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderTopColor: colors.ink,
          borderTopWidth: 3,
          backgroundColor: colors.paper,
        }}
      >
        <PixelPress wrapStyle={{ flex: 1 }} onPress={onRetake}>
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <PixelText variant="ko" size={11}>다시 찍기</PixelText>
          </View>
        </PixelPress>
        <PixelPress
          wrapStyle={{ flex: 2 }}
          onPress={handleConfirm}
          disabled={!allDone || successCount === 0}
          bg={allDone && successCount > 0 ? colors.gold : colors.pap3}
          hi={allDone && successCount > 0 ? colors.goldLt : null}
          lo={allDone && successCount > 0 ? colors.goldDk : null}
        >
          <View style={{ paddingVertical: 12, alignItems: 'center', opacity: allDone && successCount > 0 ? 1 : 0.5 }}>
            <PixelText variant="ko" size={11} weight="bold">
              {allDone ? `컬렉션에 ${successCount}장 추가 ▶` : '분석 중...'}
            </PixelText>
          </View>
        </PixelPress>
      </View>
    </View>
  );
}

function Row({ cap: _cap, state, index }: { cap: CapturedCard; state: ItemState; index: number }) {
  // /scan now returns enriched candidates directly — top candidate is what
  // the batch flow auto-selects (single picks per capture in batch mode).
  const card = state.scan?.candidates?.[0];
  const koName = card?.localName ?? card?.name ?? '';
  const jaName = card?.nameJa && card.nameJa !== koName ? card.nameJa : null;
  const setCode = (card?.setCode ?? '').toUpperCase();
  const num = card?.number?.split('/')[0] ?? '';
  const total = card?.number?.split('/')[1] ?? '';
  const rarity = card?.rarity ?? '';
  const codeLine = [setCode, [num, total].filter(Boolean).join('/'), rarity].filter(Boolean).join(' ');
  const thumb = card?.imageLarge ?? card?.imageSmall ?? card?.imageUrl ?? null;

  // JP price first (per spec); fall back to KR / USD if the source only had
  // one anchor (cardmarket EUR → all converted via FX in server).
  const ps = card?.priceSummary;
  let priceText: string | null = null;
  if (ps?.byRegion) {
    if (typeof ps.byRegion.jpy === 'number') priceText = `¥${ps.byRegion.jpy.toLocaleString()}`;
    else if (typeof ps.byRegion.krw === 'number') priceText = `₩${ps.byRegion.krw.toLocaleString()}`;
    else if (typeof ps.byRegion.usd === 'number') priceText = `$${ps.byRegion.usd.toFixed(2)}`;
  } else if (typeof card?.price?.marketPrice === 'number') {
    priceText = card.price.currency === 'JPY'
      ? `¥${card.price.marketPrice.toLocaleString()}`
      : `₩${card.price.marketPrice.toLocaleString()}`;
  }

  const phaseColor =
    state.phase === 'analyzing'
      ? colors.gold
      : state.phase === 'failed'
        ? '#EF4444'
        : state.scan?.success
          ? '#22C55E'
          : '#EF4444';

  return (
    <PixelFrame borderWidth={3} shadow={5}>
      <View style={{ padding: 10, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View
          style={{
            width: 64,
            aspectRatio: 63 / 88,
            backgroundColor: colors.pap3,
            borderColor: colors.ink,
            borderWidth: 2,
            overflow: 'hidden',
          }}
        >
          <CardArt uri={thumb} emojiSize={22} resizeMode="cover" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PixelText variant="pixel" size={9} color={colors.ink3}>
              #{index + 1}
            </PixelText>
            <PixelText variant="pixel" size={9} weight="bold" color={phaseColor}>
              {state.phase === 'analyzing'
                ? '분석중...'
                : state.phase === 'failed'
                  ? '실패'
                  : state.scan?.success
                    ? '인식 ✓'
                    : '인식 실패'}
            </PixelText>
            {state.phase === 'analyzing' ? <ActivityIndicator size="small" color={colors.gold} /> : null}
          </View>
          {state.phase === 'analyzing' ? (
            <PixelText variant="ko" size={11} color={colors.ink3} style={{ marginTop: 6 }}>
              서버에서 OCR 처리 중...
            </PixelText>
          ) : state.phase === 'failed' ? (
            <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 6 }}>
              {state.error ?? '분석 실패'}
            </PixelText>
          ) : (
            <>
              <PixelText variant="ko" size={12} weight="bold" color={colors.ink} style={{ marginTop: 4 }}>
                {koName || '인식 결과 없음'}
                {jaName ? (
                  <PixelText variant="ko" size={10} color={colors.ink3}>
                    {' '}({jaName})
                  </PixelText>
                ) : null}
              </PixelText>
              {codeLine ? (
                <PixelText variant="pixel" size={9} color={colors.ink2} style={{ marginTop: 3 }}>
                  {codeLine}
                </PixelText>
              ) : null}
              <PixelText
                variant="pixel"
                size={10}
                weight={priceText ? 'bold' : undefined}
                color={priceText ? colors.grnDk : colors.ink3}
                style={{ marginTop: 4 }}
              >
                {priceText ?? '시세 미확인'}
              </PixelText>
            </>
          )}
        </View>
      </View>
    </PixelFrame>
  );
}

function itemToCard(state: ItemState, _cap: CapturedCard): CardItem | null {
  const c = state.scan?.candidates?.[0];
  if (!c || !state.scan?.success) return null;
  const sample = CARDS[0];
  const [num] = (c.number ?? '').split('/');
  // Same JP-first preference as Row — what the user sees in the row is what
  // gets persisted as `price` in the collection.
  const priceFromBR =
    c.priceSummary?.byRegion?.jpy ??
    c.priceSummary?.byRegion?.krw ??
    null;
  const priceFromLegacy =
    typeof c.price?.marketPrice === 'number' ? c.price.marketPrice : 0;
  const price = priceFromBR ?? priceFromLegacy ?? 0;
  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    name: c.localName ?? c.name,
    set: c.setName ?? '-',
    num: num || '-',
    game: '포켓몬',
    rar: (c.rarity as CardItem['rar']) ?? sample.rar,
    grade: null,
    price,
    trend: [price],
    emoji: '🃏',
    owned: true,
    imageUrl: c.imageLarge ?? c.imageSmall ?? c.imageUrl,
  };
}
