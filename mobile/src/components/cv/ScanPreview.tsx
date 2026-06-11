import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';
import { FallbackImage } from '@/components/cv/FallbackImage';
import { CardArt } from '@/components/cv/CardArt';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { Chip } from '@/components/cv/Chip';
import { colors } from '@/theme/tokens';
import { uploadScanImage, CardScanError } from '@/services/cardScanApi';
import type { CardScanResponse, ScanCandidate, GuideRect, ScanLanguage } from '@/types/cardScan';
import { CARDS, type CardItem } from '@/data/cardvault';
import { lookupPokemonSet } from '@/data/pokemonSetMap';
import { localizeCardName } from '@/lib/cardNameKo';

interface Props {
  uri: string;
  guideRect: GuideRect;
  imageWidth: number;
  imageHeight: number;
  capturedAt: string;
  useAi?: boolean;
  language?: ScanLanguage;
  onRetake: () => void;
  onConfirm: (card: CardItem, candidate: ScanCandidate) => void;
}

type Phase = 'analyzing' | 'detected' | 'failed' | 'empty';

/** Pad a card-number string to 3 digits ("88" → "088"). */
function pad3(n: string | undefined): string {
  if (!n) return '';
  const digits = String(n).replace(/^0+(?=\d)/, '');
  return digits.length >= 3 ? digits : digits.padStart(3, '0');
}

export function ScanPreview({
  uri,
  guideRect,
  imageWidth,
  imageHeight,
  capturedAt,
  useAi = false,
  language,
  onRetake,
  onConfirm,
}: Props) {
  const [phase, setPhase] = useState<Phase>('analyzing');
  const [response, setResponse] = useState<CardScanResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Tick a 1-second elapsed counter while analyzing — without it long AI
  // scans (~10-15s) look like the app has hung.
  useEffect(() => {
    if (phase !== 'analyzing') return;
    setElapsed(0);
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  // Scanning animation — a green horizontal line that sweeps top→bottom and
  // back, layered over the captured photo while analyzing. Driven by a
  // looping Animated.Value (0..1) with native driver.
  const scanY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase !== 'analyzing') return;
    scanY.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        // useNativeDriver:false because we animate the `top` style. The
        // animation is one View, so JS-thread driving is plenty smooth.
        Animated.timing(scanY, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(scanY, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, scanY]);

  // Pixel progress bar — chunky retro-game loading bar that fills based on
  // ACTUAL milestones, not a fixed timer:
  //   0%   on mount / new scan
  //   25%  when fetch fires (image uploading)
  //   55%  while server is OCR'ing (slow tween — keeps bar visibly moving)
  //   85%  when /scan returns success
  //   100% when /lookup returns (data ready to show)
  // This way the user sees the bar reach 100% the instant info is available.
  const PROG_CELLS = 16;
  const progress = useRef(new Animated.Value(0)).current;
  const [progressTarget, setProgressTarget] = useState(0);
  useEffect(() => {
    Animated.timing(progress, {
      toValue: progressTarget,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressTarget, progress]);
  // While the server is processing (no event to fire on), creep the bar
  // slowly from 25→80% so it's never frozen for the user.
  useEffect(() => {
    if (phase !== 'analyzing') return;
    const id = setInterval(() => {
      setProgressTarget((p) => (p < 0.80 ? Math.min(0.80, p + 0.02) : p));
    }, 800);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    setPhase('analyzing');
    setErrorMsg(null);
    setResponse(null);
    setSelectedId(null);
    setProgressTarget(0.05); // mount

    setProgressTarget(0.25); // upload starting
    uploadScanImage({ uri, guideRect, imageWidth, imageHeight, capturedAt, useAi, language })
      .then((res) => {
        if (cancelled) return;
        setResponse(res);
        // Server now returns candidates already enriched with TCGdex image +
        // pricing — no follow-up /lookup needed, the bar can hit 100% as
        // soon as /scan responds.
        setProgressTarget(1);
        if (!res.success || res.candidates.length === 0) {
          setPhase('empty');
          return;
        }
        // Always show the candidate list (even if there's only one) — the
        // user explicitly asked for a selectable list with image + price.
        setSelectedId(res.candidates[0].id);
        setPhase('detected');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof CardScanError ? e.message : '카드 인식에 실패했습니다.';
        setErrorMsg(msg);
        setPhase('failed');
        setProgressTarget(1);
      });

    return () => {
      cancelled = true;
    };
  }, [uri, guideRect, imageWidth, imageHeight, capturedAt, useAi, language]);

  const detected = phase === 'detected';
  const candidates = response?.candidates ?? [];
  const picked = candidates.find((c) => c.id === selectedId) ?? candidates[0];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 80 }}>
      <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
        <PixelFrame bg={colors.ink2} hi="rgba(255,255,255,0.08)" lo="rgba(0,0,0,0.5)">
          <View style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <PixelText variant="ko" size={11} color={detected ? '#22C55E' : colors.gold} weight="bold">
                {phase === 'analyzing' ? '카드 영역 분석 중...' :
                  phase === 'detected' ? '카드 영역 감지 완료' :
                  phase === 'empty' ? '카드를 인식하지 못했습니다' :
                  '분석 실패'}
              </PixelText>
              {response?.usedAi ? (
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(34,197,94,0.85)', borderColor: colors.ink, borderWidth: 1 }}>
                  <PixelText variant="pixel" size={8} color={colors.ink} weight="bold">🤖 AI</PixelText>
                </View>
              ) : null}
            </View>
            <View style={{ position: 'relative', alignItems: 'center', overflow: 'hidden' }}>
              {/* During analysis we show the user's capture (the photo being
                  OCR'd, with the scanline sweep). Once detection completes
                  we swap to the API / DB card art — the user capture is OCR
                  input only, never the displayed card art. Falls back to
                  an emoji placeholder when no API image is available. */}
              {phase === 'analyzing' ? (
                <FallbackImage
                  uri={null}
                  fallbackUri={uri}
                  style={{ width: '100%', aspectRatio: 63 / 88, backgroundColor: '#000' }}
                  resizeMode="contain"
                  fallbackResizeMode="cover"
                />
              ) : (
                <View style={{ width: '100%', aspectRatio: 63 / 88, backgroundColor: '#000' }}>
                  <CardArt
                    uri={picked?.imageLarge ?? picked?.imageSmall ?? null}
                    emojiSize={72}
                    resizeMode="contain"
                    style={{ backgroundColor: '#000' }}
                  />
                </View>
              )}
              {/* Scanning animation — green sweep line + soft trail glow.
                  Only rendered while analyzing. `top` percentage interpolation
                  drives the sweep position so it tracks any card aspect. */}
              {phase === 'analyzing' ? (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 6,
                    right: 6,
                    height: 32,
                    top: scanY.interpolate({ inputRange: [0, 1], outputRange: ['0%', '94%'] }),
                  }}
                >
                  <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 28, backgroundColor: 'rgba(34,197,94,0.18)' }} />
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: '#22C55E' }} />
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 3, height: 1, backgroundColor: 'rgba(255,255,255,0.7)' }} />
                </Animated.View>
              ) : null}
              {/* Pixel grid overlay during analyzing — adds the retro "we're
                  computing" texture. 8 horizontal scan rows at 12% opacity. */}
              {phase === 'analyzing' ? (
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${(i * 100) / 12}%`,
                        height: 1,
                        backgroundColor: 'rgba(34,197,94,0.10)',
                      }}
                    />
                  ))}
                </View>
              ) : null}
              {/* detected card boundary */}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  right: 6,
                  bottom: 6,
                  borderColor: detected ? '#22C55E' : phase === 'failed' || phase === 'empty' ? '#EF4444' : 'rgba(255,210,63,0.85)',
                  borderWidth: 3,
                }}
              />
              {/* corner brackets */}
              {(
                [
                  { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5 },
                  { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5 },
                  { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5 },
                  { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5 },
                ] as const
              ).map((pos, i) => (
                <View
                  key={i}
                  pointerEvents="none"
                  style={[
                    { position: 'absolute', width: 22, height: 22, borderColor: detected ? '#22C55E' : phase === 'failed' || phase === 'empty' ? '#EF4444' : colors.gold },
                    pos,
                  ]}
                />
              ))}
              {/* bottom-left ROI — card number / set / rarity */}
              {detected && response?.extracted?.cardNumber ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 10,
                    bottom: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 4,
                    backgroundColor: 'rgba(34,197,94,0.85)',
                    borderColor: colors.ink,
                    borderWidth: 2,
                  }}
                >
                  <PixelText variant="pixel" size={9} color={colors.ink} weight="bold">
                    {response.extracted.cardNumber}
                    {response.extracted.totalNumber ? `/${response.extracted.totalNumber}` : ''}
                    {response.extracted.rarity ? ` · ${response.extracted.rarity}` : ''}
                  </PixelText>
                </View>
              ) : null}
            </View>
            <PixelText variant="ko" size={10} color="rgba(255,255,255,0.6)" style={{ marginTop: 10 }}>
              {phase === 'analyzing'
                ? '카드와 배경의 경계를 찾는 중...'
                : phase === 'detected'
                ? response?.extracted?.rawText
                  ? `OCR: ${response.extracted.rawText}`
                  : '경계를 찾았습니다. 카드 정보를 확인하세요.'
                : phase === 'empty'
                ? '카드를 다시 또렷하게 촬영해주세요.'
                : (errorMsg ?? '분석 실패')}
            </PixelText>
          </View>
        </PixelFrame>
      </View>

      {/* Standalone info banner removed — info now lives inside the
          selected-candidate row (CandidateRow) below. */}

      {phase === 'analyzing' ? (
        <View style={{ marginHorizontal: 14, paddingVertical: 18, alignItems: 'center' }}>
          {/* Retro game-style pixel progress bar. 16 chunky cells fill in
              sequence as `progress` interpolates 0→1. The header echoes
              old NES "NOW LOADING" plates. */}
          <PixelText variant="pixel" size={11} color={colors.gold} weight="bold" style={{ letterSpacing: 2 }}>
            ▶ NOW LOADING
          </PixelText>
          <PixelText variant="ko" size={9} color={colors.ink3} style={{ marginTop: 4, textAlign: 'center' }}>
            {elapsed < 3
              ? '이미지 업로드 중...'
              : elapsed < 8
              ? '카드 영역 추출 중...'
              : elapsed < 16
              ? 'AI 카드 정보 인식 중...'
              : 'TCGdex에서 카드 정보 받아오는 중...'}
          </PixelText>

          {/* Outer frame for the bar — chunky 4px black border, light cream
              fill, like a Game Boy boot bar. */}
          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              padding: 4,
              gap: 2,
              backgroundColor: colors.ink,
              borderColor: colors.ink,
              borderWidth: 4,
            }}
          >
            {Array.from({ length: PROG_CELLS }).map((_, i) => {
              // Each cell lights up when progress > i / PROG_CELLS. We use
              // an opacity step instead of conditional rendering so RN
              // doesn't unmount cells (smoother visually).
              const opacity = progress.interpolate({
                inputRange: [i / PROG_CELLS, (i + 0.5) / PROG_CELLS],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              });
              return (
                <View
                  key={i}
                  style={{ width: 12, height: 18, backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                  <Animated.View
                    style={{
                      flex: 1,
                      backgroundColor: '#FFD23F',
                      opacity,
                    }}
                  />
                </View>
              );
            })}
          </View>

          <PixelText variant="pixel" size={10} color={colors.ink3} style={{ marginTop: 8 }}>
            ⏱ {elapsed}s
          </PixelText>
        </View>
      ) : null}

      {phase === 'detected' && candidates.length > 0 ? (
        <View style={{ marginHorizontal: 14, gap: 10 }}>
          {response?.needsUserSelection ? (
            <PixelText variant="ko" size={11} color={colors.ink} weight="bold" style={{ marginBottom: 4 }}>
              {response.message ?? '이 카드 맞나요?'}
            </PixelText>
          ) : null}
          {candidates.map((c) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              selected={selectedId === c.id}
              onPress={() => setSelectedId(c.id)}
              koTranslate={language === 'ko'}
            />
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 14 }}>
        <PixelPress wrapStyle={{ flex: 1 }} onPress={onRetake}>
          <View style={{ paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }}>
            <PixelText variant="ko" size={11}>다시 찍기</PixelText>
          </View>
        </PixelPress>
        <PixelPress
          wrapStyle={{ flex: 2 }}
          onPress={() => {
            if (!picked) return;
            const card = candidateToCard(picked);
            onConfirm(card, picked);
          }}
          disabled={!picked}
          bg={picked ? colors.gold : colors.pap3}
          hi={picked ? colors.goldLt : null}
          lo={picked ? colors.goldDk : null}
        >
          <View style={{ paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', opacity: picked ? 1 : 0.5 }}>
            <PixelText variant="ko" size={11} weight="bold">
              {picked ? '컬렉션에 추가 ▶' : phase === 'analyzing' ? `분석 중... (${elapsed}s)` : '다시 시도'}
            </PixelText>
          </View>
        </PixelPress>
      </View>
    </ScrollView>
  );
}

function CandidateRow({
  candidate,
  selected,
  onPress,
  koTranslate,
}: {
  candidate: ScanCandidate;
  selected: boolean;
  onPress: () => void;
  /** 한국어 스캔 모드 — 일본어 후보명을 한국어로 번역/음역해 표시. */
  koTranslate?: boolean;
}) {
  // Korean name first (localName), 한국어 모드면 일본어 이름도 번역해 표시.
  const koName =
    candidate.localName ??
    (koTranslate ? localizeCardName(candidate.name) : candidate.name);
  const jaName =
    candidate.nameJa && candidate.nameJa !== koName ? candidate.nameJa : null;

  // Code line: "SV8 035/106 U" — pulled from the candidate itself (server
  // already merged TCGdex + OCR).
  const setCode = (candidate.setCode ?? '').toUpperCase();
  const cardNum = pad3(candidate.number?.split('/')[0]);
  const totalNum = pad3(candidate.number?.split('/')[1]);
  const rarity = candidate.rarity ?? '';
  const codeLine = [setCode, [cardNum, totalNum].filter(Boolean).join('/'), rarity]
    .filter(Boolean)
    .join(' ');

  // Pack name — prefer Korean from POKEMON_SET_MAP, else TCGdex set name.
  const setInfo = lookupPokemonSet(candidate.setCode);
  const packName = setInfo?.name ?? candidate.setName ?? '';

  // Price — snkrdunk JPY first (when matched), then TCGdex multi-region.
  const ps = candidate.priceSummary;
  const snkr = candidate.snkrdunk;
  const priceLines: Array<{ label: string; text: string; emph?: boolean }> = [];
  if (ps?.byRegion) {
    if (typeof ps.byRegion.jpy === 'number')
      priceLines.push({ label: '🇯🇵 JP', text: `¥${ps.byRegion.jpy.toLocaleString()}`, emph: true });
    if (typeof ps.byRegion.krw === 'number')
      priceLines.push({ label: '🇰🇷 KR', text: `₩${ps.byRegion.krw.toLocaleString()}` });
    if (typeof ps.byRegion.eur === 'number')
      priceLines.push({ label: '🇪🇺 EU', text: `€${ps.byRegion.eur.toFixed(2)}` });
    if (typeof ps.byRegion.usd === 'number')
      priceLines.push({ label: '🇺🇸 NA', text: `$${ps.byRegion.usd.toFixed(2)}` });
  } else if (candidate.price?.marketPrice) {
    priceLines.push({
      label: candidate.price.currency === 'JPY' ? '🇯🇵 JP' : '🇰🇷 KR',
      text:
        candidate.price.currency === 'JPY'
          ? `¥${candidate.price.marketPrice.toLocaleString()}`
          : `₩${candidate.price.marketPrice.toLocaleString()}`,
      emph: true,
    });
  }

  // Image: snkrdunk match wins (server already overwrote imageLarge but we
  // also accept a raw snkr.imageUrl just in case).
  const thumb =
    snkr?.imageUrl ?? candidate.imageLarge ?? candidate.imageSmall ?? candidate.imageUrl ?? null;

  return (
    <PixelPress
      onPress={onPress}
      bg={selected ? colors.gold : colors.white}
      hi={selected ? colors.goldLt : 'rgba(255,255,255,0.95)'}
      lo={selected ? colors.goldDk : 'rgba(0,0,0,0.30)'}
    >
      <View style={{ padding: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 88, aspectRatio: 63 / 88, backgroundColor: colors.pap3, borderColor: colors.ink, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {/* cover — 카드 이미지가 컨테이너를 꽉 채우게 (contain 은 여백이 커서 너무 작게 보임) */}
          <CardArt uri={thumb} emojiSize={28} resizeMode="cover" />
        </View>
        <View style={{ flex: 1 }}>
          {/* Snkrdunk source badge — visible when the displayed image/price
              came from snkrdunk. */}
          {snkr ? (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.ink,
                paddingHorizontal: 5,
                paddingVertical: 2,
                marginBottom: 5,
                borderColor: colors.gold,
                borderWidth: 1,
              }}
            >
              <PixelText variant="pixel" size={8} color={colors.gold}>
                🇯🇵 스니덩크 매칭{snkr.cacheHit ? ' · 캐시' : ''}
              </PixelText>
            </View>
          ) : null}
          {/* Line 1 — 한글이름(일본이름) */}
          <PixelText variant="ko" size={13} weight="bold" color={colors.ink}>
            {koName}
            {jaName ? (
              <PixelText variant="ko" size={11} color={colors.ink3}>
                {' '}({jaName})
              </PixelText>
            ) : null}
          </PixelText>
          {/* Line 2 — 코드명 (set code + number/total + rarity) */}
          {codeLine ? (
            <PixelText variant="pixel" size={10} color={colors.ink2} style={{ marginTop: 4 }}>
              {codeLine}
            </PixelText>
          ) : null}
          {/* Line 3 — 카드팩 이름 */}
          {packName ? (
            <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 2 }}>
              {packName}
            </PixelText>
          ) : null}
          {/* Line 4 — 시세 (multi-region) */}
          {priceLines.length > 0 ? (
            <View style={{ marginTop: 6, gap: 1 }}>
              {priceLines.map((p) => (
                <View key={p.label} style={{ flexDirection: 'row', gap: 6 }}>
                  <PixelText variant="pixel" size={9} color={p.emph ? colors.ink : colors.ink3} style={{ minWidth: 36 }}>
                    {p.label}
                  </PixelText>
                  <PixelText variant="pixel" size={p.emph ? 11 : 9} color={p.emph ? colors.grnDk : colors.ink3} weight={p.emph ? 'bold' : undefined}>
                    {p.text}
                  </PixelText>
                </View>
              ))}
            </View>
          ) : (
            <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: 6 }}>
              시세 정보 없음
            </PixelText>
          )}
        </View>
        {selected ? (
          <PixelText variant="pixel" size={14} color={colors.ink} weight="bold">✓</PixelText>
        ) : null}
      </View>
    </PixelPress>
  );
}

function candidateToCard(c: ScanCandidate): CardItem {
  // Best-effort mapping for the existing collection model (CardItem). All
  // enrichment now lives on the candidate itself (server merged TCGdex +
  // local DB + snkrdunk), so this is a straight read-through.
  const sample = CARDS[0];
  const [num] = (c.number ?? '').split('/');
  // snkrdunk JPY wins (it's the explicit user-requested source for price),
  // then TCGdex multi-region JPY, then KRW, then legacy marketPrice.
  const snkrJpy = typeof c.snkrdunk?.priceJpy === 'number' ? c.snkrdunk.priceJpy : null;
  const tcgJpy = c.priceSummary?.byRegion?.jpy ?? null;
  const tcgKrw = c.priceSummary?.byRegion?.krw ?? null;
  const legacyPrice = typeof c.price?.marketPrice === 'number' ? c.price.marketPrice : 0;
  let price = 0;
  let priceCurrency: CardItem['priceCurrency'] = 'KRW';
  if (snkrJpy && snkrJpy > 0) {
    price = snkrJpy;
    priceCurrency = 'JPY';
  } else if (tcgJpy && tcgJpy > 0) {
    price = tcgJpy;
    priceCurrency = 'JPY';
  } else if (tcgKrw && tcgKrw > 0) {
    price = tcgKrw;
    priceCurrency = 'KRW';
  } else {
    price = legacyPrice;
    priceCurrency = c.price?.currency === 'JPY' ? 'JPY' : 'KRW';
  }
  // Clean name — snkrdunk's localizedName is long (e.g. "ピカチュウ P [M-P 020]
  // (プロモカードパック「マクドナルド ハッピーセット2025」)"). Prefer nameJa /
  // localName, else trim at the first '[' or '(' so the AppBar / list row
  // doesn't wrap or overflow.
  const cleanName = c.localName
    ?? c.nameJa
    ?? (c.name ?? '').split(/[\[(（【]/)[0].trim()
    ?? c.name
    ?? '카드';
  return {
    id: Date.now(),
    name: cleanName,
    set: c.setName ?? '-',
    num: num || '-',
    game: '포켓몬',
    rar: (c.rarity as CardItem['rar']) ?? sample.rar,
    grade: null,
    price,
    priceCurrency,
    trend: [price],
    emoji: '🃏',
    owned: true,
    imageUrl: c.snkrdunk?.imageUrl ?? c.imageLarge ?? c.imageSmall ?? c.imageUrl,
    snkrdunkApparelId: c.snkrdunk?.apparelId,
  };
}
