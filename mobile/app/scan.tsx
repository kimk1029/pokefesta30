import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Pressable, TextInput, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelBall } from '@/components/PixelBall';
import { CardThumb } from '@/components/cv/CardThumb';
import { Chip } from '@/components/cv/Chip';
import { RarBadge } from '@/components/cv/RarBadge';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { CardScanner, type CapturedCard } from '@/components/cv/CardScanner';
import { ScanPreview } from '@/components/cv/ScanPreview';
import { BatchScanPreview } from '@/components/cv/BatchScanPreview';
import { useChrome } from '@/components/ChromeContext';
import { colors } from '@/theme/tokens';
import { CARDS, GAMES, fmt, priceLabel, displayCardName, inferCardCurrency, cardProfit, type CardItem, type Game, type Rarity, type PriceCurrency } from '@/data/cardvault';
import { addCards } from '@/lib/collection';
import { usePriceMode } from '@/lib/priceMode';
import { lookupCardInfo } from '@/services/cardScanApi';
import { searchSnkrdunkByQuery } from '@/services/snkrdunk';
import { koToJaSearch } from '@/lib/cardSearchJa';
import { createMyCard } from '@/lib/myApi';

/** "¥2,000" → 2000. 못 읽으면 0. */
function parseYen(t?: string): number {
  if (!t) return 0;
  const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
import type { GuideRect, ScanLanguage } from '@/types/cardScan';

type Mode = 'choose' | 'camera' | 'preview' | 'batch' | 'manual' | 'register' | 'result' | 'batchResult';

/** 이번 달을 YYYY-MM 으로. 등록 시트 구매 시기 기본값. */
function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ScanScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    regApparelId?: string;
    regName?: string;
    regImage?: string;
    regPrice?: string;
  }>();
  const initRef = useRef(false);
  const [mode, setMode] = useState<Mode>('choose');
  const [found, setFound] = useState<CardItem | null>(null);
  const [batchFound, setBatchFound] = useState<CardItem[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMeta, setPhotoMeta] = useState<{
    guideRect: GuideRect;
    imageWidth: number;
    imageHeight: number;
    capturedAt: string;
  } | null>(null);
  const [captures, setCaptures] = useState<CapturedCard[]>([]);
  // PaddleOCR (server-side, free) is dramatically more accurate than Tesseract
  // on stylized italic numbers / Korean titles. Always ON — toggle removed
  // since Tesseract path can't reliably read m1L-era set badges.
  const useAi = true;
  // Card-name language. Routes server OCR to a single worker for speed + accuracy.
  const [scanLang, setScanLang] = useState<ScanLanguage>('ko');
  const { setHidden } = useChrome();
  useEffect(() => {
    setHidden(mode === 'camera');
    return () => setHidden(false);
  }, [mode, setHidden]);
  const { mode: priceMode } = usePriceMode();
  const [manName, setManName] = useState('');
  const [manSet, setManSet] = useState('');
  const [manNum, setManNum] = useState('');
  const [manGame, setManGame] = useState<Game>('포켓몬');
  const [manRar, setManRar] = useState<Rarity>('R');
  // 직접입력 검색 상태 — 세트코드+번호로 조회한 결과 리스트.
  const [manSearching, setManSearching] = useState(false);
  const [manSearched, setManSearched] = useState(false);
  const [manErr, setManErr] = useState<string | null>(null);
  const [manResults, setManResults] = useState<CardItem[]>([]);

  // 5단계 — 구매정보 입력 시트 상태. 카드 확인 직후 이 카드를 받아 띄운다.
  const [pendingCard, setPendingCard] = useState<CardItem | null>(null);
  const [pendingFrom, setPendingFrom] = useState<'scan' | 'manual'>('scan');
  const [buyYm, setBuyYm] = useState(currentYm());
  const [buyPriceStr, setBuyPriceStr] = useState('');
  const [buyCur, setBuyCur] = useState<PriceCurrency>('KRW');
  const [buyQty, setBuyQty] = useState(1);
  const [selfPulled, setSelfPulled] = useState(false);
  const [graded, setGraded] = useState(false);
  const [gradeCompany, setGradeCompany] = useState('PSA');
  const [gradeValue, setGradeValue] = useState('');

  /** 확정된 카드를 받아 구매정보 입력 단계로. 입력값은 매번 초기화. */
  const openRegister = (card: CardItem, from: 'scan' | 'manual') => {
    setPendingCard(card);
    setPendingFrom(from);
    setBuyYm(currentYm());
    setBuyPriceStr('');
    // 시세가 JPY 인 카드는 구매가도 JPY 로 입력할 확률이 높다 → 기본 통화 맞춤.
    setBuyCur(inferCardCurrency(card));
    setBuyQty(1);
    setSelfPulled(false);
    setGraded(card.grade != null);
    setGradeCompany('PSA');
    setGradeValue(card.grade != null ? String(card.grade) : '');
    setMode('register');
  };

  // 진입 파라미터 처리 (한 번만):
  // - regApparelId: 시세 상세 "내 컬렉션" → 해당 카드로 바로 등록 시트
  // - mode=manual: 직접 입력 진입
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (params.regApparelId) {
      const apparelId = parseInt(String(params.regApparelId), 10);
      const priceJpy = params.regPrice ? parseInt(String(params.regPrice), 10) : 0;
      if (Number.isFinite(apparelId) && apparelId > 0) {
        openRegister(
          {
            id: Date.now(),
            name: params.regName ? String(params.regName) : '카드',
            set: '-',
            num: '-',
            game: '포켓몬',
            rar: 'R',
            grade: null,
            price: priceJpy > 0 ? priceJpy : 0,
            priceSingle: priceJpy > 0 ? priceJpy : undefined,
            priceCurrency: 'JPY',
            trend: [],
            emoji: '🃏',
            owned: true,
            snkrdunkApparelId: apparelId,
            imageUrl: params.regImage ? String(params.regImage) : undefined,
          },
          'manual',
        );
      }
    } else if (params.mode === 'manual') {
      setMode('manual');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 6단계로 — 구매정보를 카드에 반영(또는 건너뛰고)해 저장. */
  const finalizeRegister = (skip: boolean) => {
    if (!pendingCard) return;
    // 등급(그레이딩) 정보는 건너뛰기와 무관하게 항상 반영.
    const gradingPatch: Partial<CardItem> = graded
      ? { graded: true, gradeCompany: gradeCompany.trim() || undefined, gradeValue: gradeValue.trim() || undefined }
      : { graded: false };

    let card: CardItem;
    if (selfPulled) {
      // 직접뽑기 — 등록 시점 현재시세를 기준가로 박는다.
      const basis = pendingCard.priceSingle ?? pendingCard.price;
      card = {
        ...pendingCard,
        ...gradingPatch,
        selfPulled: true,
        buyPrice: basis > 0 ? basis : undefined,
        buyCurrency: inferCardCurrency(pendingCard),
        qty: Math.max(1, buyQty),
        buyDate: buyYm || undefined,
      };
    } else {
      const price = parseInt(buyPriceStr, 10);
      card =
        skip || !(price > 0)
          ? { ...pendingCard, ...gradingPatch, selfPulled: false, qty: Math.max(1, buyQty) }
          : {
              ...pendingCard,
              ...gradingPatch,
              selfPulled: false,
              buyPrice: price,
              buyCurrency: buyCur,
              qty: Math.max(1, buyQty),
              buyDate: buyYm || undefined,
            };
    }
    // 로컬 캐시(홈 등 로컬 기반 화면용) + 서버 DB 양쪽에 저장.
    addCards([card]);
    // 서버 컬렉션(/api/me/cards)에도 등록 — 내 카드 화면은 서버에서 불러오므로 필수.
    createMyCard({
      snkrdunkApparelId: card.snkrdunkApparelId ?? null,
      ocrSetCode: card.set && card.set !== '-' ? card.set : null,
      ocrCardNumber: card.num && card.num !== '-' ? card.num.split('/')[0] : null,
      nickname: card.name ?? null,
      photoUrl: card.snkrdunkApparelId ? null : card.imageUrl ?? null,
      buyPrice: card.buyPrice ?? null,
      buyCurrency: card.buyCurrency ?? 'KRW',
      qty: card.qty ?? 1,
      buyDate: card.buyDate ?? null,
      selfPulled: card.selfPulled ?? false,
      graded: card.graded ?? false,
      gradeCompany: card.gradeCompany ?? null,
      gradeValue: card.gradeValue ?? null,
    }).catch((e) => {
      console.warn('[scan] createMyCard 실패:', e?.message ?? e);
    });
    setFound(card);
    setMode('result');
  };

  /** 입력값(또는 lookup 결과)으로 CardItem 구성. */
  const buildManualCard = (over?: Partial<CardItem>): CardItem => ({
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: manName || '무제 카드',
    set: manSet || '-',
    num: manNum || '-',
    game: manGame,
    rar: manRar,
    grade: null,
    price: 0,
    trend: [],
    emoji: '🃏',
    owned: true,
    ...over,
  });

  /** 세트코드 + 카드번호로 검색 → 결과 리스트. */
  const runManualSearch = async () => {
    if (manSearching) return;
    setManErr(null);
    if (!manSet.trim() || !manNum.trim()) {
      setManErr('세트 코드와 카드 번호를 입력해 주세요');
      return;
    }
    setManSearching(true);
    setManSearched(false);
    setManResults([]);
    try {
      const res = await lookupCardInfo({
        setCode: manSet.trim(),
        cardNumber: manNum.trim().split('/')[0],
        name: manName.trim() || undefined,
      });
      const list: CardItem[] = [];
      // 1) TCGdex 정확 매칭 + 로컬 DB
      if (res.found && res.card) {
        const c = res.card;
        const jpy = c.priceSummary?.byRegion?.jpy ?? null;
        const krw = c.priceSummary?.byRegion?.krw ?? null;
        const priceCur: PriceCurrency = jpy != null ? 'JPY' : 'KRW';
        const priceVal = jpy != null ? jpy : krw ?? 0;
        list.push(
          buildManualCard({
            name: c.localName || c.name || manName || '무제 카드',
            set: c.setCode || manSet || '-',
            num: c.number || manNum || '-',
            price: Math.round(priceVal),
            priceSingle: Math.round(priceVal),
            priceCurrency: priceCur,
            imageUrl: c.imageLarge || c.imageSmall || undefined,
          }),
        );
      }

      // 2) snkrdunk 보강 — 코드+번호로, 이름이 있으면 한→일 번역해서도 검색.
      const seen = new Set<number>();
      const queries = [`${manSet.trim()} ${manNum.trim()}`.trim()];
      if (manName.trim()) queries.push(koToJaSearch(manName.trim()) || manName.trim());
      for (const q of queries) {
        if (!q) continue;
        const rows = await searchSnkrdunkByQuery(q).catch(() => []);
        for (const row of rows.slice(0, 20)) {
          if (!row?.apparelId || seen.has(row.apparelId)) continue;
          seen.add(row.apparelId);
          const price = parseYen(row.priceText);
          list.push(
            buildManualCard({
              name: row.name,
              set: manSet || '-',
              num: manNum || '-',
              price,
              priceSingle: price > 0 ? price : undefined,
              priceCurrency: 'JPY',
              snkrdunkApparelId: row.apparelId,
              imageUrl: row.imageUrl ?? undefined,
            }),
          );
        }
      }

      setManResults(list);
      setManSearched(true);
    } catch (e) {
      setManErr(e instanceof Error ? e.message : '검색 실패');
    } finally {
      setManSearching(false);
    }
  };

  if (mode === 'camera') {
    return (
      <CardScanner
        onCancel={() => setMode('choose')}
        onCaptured={(items) => {
          if (items.length === 0) {
            setMode('choose');
            return;
          }
          if (items.length === 1) {
            setPhotoUri(items[0].uri);
            setPhotoMeta(items[0].meta);
            setMode('preview');
          } else {
            setCaptures(items);
            setMode('batch');
          }
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar
        onBack={() => {
          if (mode === 'choose') {
            router.replace('/my/cards' as never);
            return;
          }
          if (mode === 'register') {
            setMode(pendingFrom === 'manual' ? 'manual' : 'choose');
            return;
          }
          if (mode === 'batchResult' || mode === 'batch') {
            setBatchFound([]);
            setCaptures([]);
          }
          setMode('choose');
        }}
        title="카드 등록"
      />
      {mode === 'preview' && photoUri && photoMeta ? (
        <ScanPreview
          uri={photoUri}
          guideRect={photoMeta.guideRect}
          imageWidth={photoMeta.imageWidth}
          imageHeight={photoMeta.imageHeight}
          capturedAt={photoMeta.capturedAt}
          useAi={useAi}
          language={scanLang}
          onRetake={() => setMode('camera')}
          onConfirm={(card) => openRegister(card, 'scan')}
        />
      ) : mode === 'batch' ? (
        <BatchScanPreview
          captures={captures}
          useAi={useAi}
          language={scanLang}
          onRetake={() => setMode('camera')}
          onConfirm={(cards) => {
            addCards(cards);
            setBatchFound(cards);
            setMode('batchResult');
          }}
        />
      ) : mode === 'batchResult' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}>
          <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
            <PixelText variant="pixel" size={12} color={colors.grnDk} weight="bold" style={{ letterSpacing: 1 }}>
              ✓ {batchFound.length}장 인식 완료
            </PixelText>
            <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 4 }}>
              아래 카드들을 컬렉션에 추가했습니다.
            </PixelText>
          </View>
          <View style={{ marginHorizontal: 14, gap: 8, marginBottom: 14 }}>
            {batchFound.map((c) => (
              <PixelFrame key={c.id} borderWidth={3} shadow={5}>
                <View style={{ flexDirection: 'row', gap: 10, padding: 10, alignItems: 'center' }}>
                  <View style={{ width: 48, height: 64, borderColor: colors.ink, borderWidth: 2 }}>
                    <CardThumb card={c} height={60} emojiSize={22} showLabel={false} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelText variant="ko" size={12} weight="bold">{displayCardName(c.name)}</PixelText>
                    <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: 3 }}>
                      {c.set} · {c.num}
                    </PixelText>
                    <PixelText
                      variant="pixel"
                      size={10}
                      color={c.price > 0 ? colors.grnDk : colors.ink3}
                      style={{ marginTop: 3 }}
                    >
                      {priceLabel(c.price, inferCardCurrency(c))}
                    </PixelText>
                  </View>
                  <RarBadge rar={c.rar} />
                </View>
              </PixelFrame>
            ))}
          </View>
          <View style={{ marginHorizontal: 14, flexDirection: 'row', gap: 8 }}>
            <PixelPress wrapStyle={{ flex: 1 }} onPress={() => { setBatchFound([]); setCaptures([]); setMode('choose'); }}>
              <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                <PixelText variant="pixel" size={10}>처음으로</PixelText>
              </View>
            </PixelPress>
            <PixelPress
              wrapStyle={{ flex: 1 }}
              onPress={() => router.push('/my/cards' as never)}
              bg={colors.gold}
              hi={colors.goldLt}
              lo={colors.goldDk}
            >
              <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                <PixelText variant="pixel" size={10}>컬렉션으로 ✓</PixelText>
              </View>
            </PixelPress>
          </View>
        </ScrollView>
      ) : (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}>
        {mode === 'choose' && (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
              <PixelBall size={80} />
              <PixelText variant="pixel" size={13} style={{ marginTop: 6, letterSpacing: 2 }}>
                카드 추가
              </PixelText>
              <PixelText variant="pixel" size={10} color={colors.ink3} style={{ letterSpacing: 0.5 }}>
                방법을 선택하세요
              </PixelText>
            </View>

            <View style={{ marginHorizontal: 14, gap: 12 }}>
              <PixelPress
                onPress={() => setMode('camera')}
                bg={colors.ink2}
                borderWidth={4}
                shadow={7}
                hi="rgba(255,255,255,0.08)"
                lo="rgba(0,0,0,0.4)"
                inner={3}
              >
                <View
                  style={{
                    padding: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      backgroundColor: colors.grn,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: colors.ink,
                      borderWidth: 3,
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>📷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelText variant="pixel" size={12} color={colors.white} style={{ marginBottom: 7, letterSpacing: 1 }}>
                      사진으로 스캔
                    </PixelText>
                    <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.5)" style={{ lineHeight: 16 }}>
                      카드를 촬영하면 자동으로{`\n`}카드 정보를 인식합니다
                    </PixelText>
                  </View>
                  <PixelText variant="pixel" size={16} color={colors.gold}>
                    ▶
                  </PixelText>
                </View>
              </PixelPress>

              {/* Card-name language — pick one so the server runs only that
                  language's OCR worker. Cuts time + drops cross-language hallucination. */}
              <View
                style={{
                  flexDirection: 'row',
                  borderColor: colors.ink,
                  borderWidth: 2,
                  backgroundColor: colors.white,
                }}
              >
                {(
                  [
                    { v: 'ko', label: '한국어' },
                    { v: 'jp', label: '일본어' },
                    { v: 'en', label: 'English' },
                  ] as const
                ).map((opt, i) => (
                  <Pressable
                    key={opt.v}
                    onPress={() => setScanLang(opt.v)}
                    style={{
                      flex: 1,
                      paddingVertical: 11,
                      alignItems: 'center',
                      backgroundColor: scanLang === opt.v ? colors.gold : 'transparent',
                      borderLeftWidth: i === 0 ? 0 : 2,
                      borderLeftColor: colors.ink,
                    }}
                  >
                    <PixelText variant="pixel" size={11} color={scanLang === opt.v ? colors.ink : colors.ink3}>
                      {opt.label}
                    </PixelText>
                  </Pressable>
                ))}
              </View>
              <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: -4, marginBottom: -2, marginLeft: 2 }}>
                카드 이름이 어느 언어인지 골라주세요
              </PixelText>

              <PixelPress onPress={() => setMode('manual')} borderWidth={4} shadow={7}>
                <View
                  style={{
                    padding: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      backgroundColor: colors.gold,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: colors.ink,
                      borderWidth: 3,
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>✏️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <PixelText variant="pixel" size={12} style={{ marginBottom: 7, letterSpacing: 1 }}>
                      직접 입력
                    </PixelText>
                    <PixelText variant="pixel" size={9} color={colors.ink3} style={{ lineHeight: 16 }}>
                      카드 이름·세트·번호 등{`\n`}정보를 직접 입력해 등록합니다
                    </PixelText>
                  </View>
                  <PixelText variant="pixel" size={16}>
                    ▶
                  </PixelText>
                </View>
              </PixelPress>
            </View>
          </>
        )}

        {mode === 'manual' && (
          <View style={{ paddingHorizontal: 14, gap: 14 }}>
            <View>
              <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
                🎮 게임 <Text style={{ color: colors.red }}>*</Text>
              </PixelText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {(GAMES.slice(1) as Game[]).map((g) => (
                  <Chip key={g} on={manGame === g} onPress={() => setManGame(g)} size={9} px={9} py={6}>
                    {g}
                  </Chip>
                ))}
              </View>
            </View>

            <View>
              <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
                📛 카드명 <Text style={{ color: colors.ink3 }}>(선택)</Text>
              </PixelText>
              <TextInput
                value={manName}
                onChangeText={setManName}
                placeholder="예) 리자몽 EX, 블랙 로터스"
                placeholderTextColor={colors.ink4}
                style={inputStyle}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <PixelText variant="pixel" size={10} style={{ marginBottom: 8, letterSpacing: 1 }}>
                  세트 코드 <Text style={{ color: colors.red }}>*</Text>
                </PixelText>
                <TextInput
                  value={manSet}
                  onChangeText={(t) => setManSet(t.toUpperCase())}
                  placeholder="예) SV1"
                  placeholderTextColor={colors.ink4}
                  autoCapitalize="characters"
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PixelText variant="pixel" size={10} style={{ marginBottom: 8, letterSpacing: 1 }}>
                  카드 번호 <Text style={{ color: colors.red }}>*</Text>
                </PixelText>
                <TextInput
                  value={manNum}
                  onChangeText={setManNum}
                  placeholder="006"
                  placeholderTextColor={colors.ink4}
                  style={inputStyle}
                />
              </View>
            </View>

            <View>
              <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
                ✨ 희귀도 <Text style={{ color: colors.red }}>*</Text>
              </PixelText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {(['C', 'U', 'R', 'SR', 'HR', 'S'] as Rarity[]).map((r) => (
                  <Chip key={r} on={manRar === r} onPress={() => setManRar(r)} size={11} px={12} py={8}>
                    {r}
                  </Chip>
                ))}
              </View>
            </View>

            {manErr && (
              <PixelText variant="pixel" size={10} color={colors.red}>
                ⚠ {manErr}
              </PixelText>
            )}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <PixelPress wrapStyle={{ flex: 1 }} onPress={() => setMode('choose')}>
                <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                  <PixelText variant="pixel" size={11}>
                    ← 뒤로
                  </PixelText>
                </View>
              </PixelPress>
              <PixelPress
                wrapStyle={{ flex: 2 }}
                onPress={runManualSearch}
                disabled={manSearching || !manSet || !manNum}
                bg={!manSearching && manSet && manNum ? colors.gold : colors.pap3}
                hi={!manSearching && manSet && manNum ? colors.goldLt : null}
                lo={!manSearching && manSet && manNum ? colors.goldDk : null}
              >
                <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                  <PixelText variant="pixel" size={11}>
                    {manSearching ? '검색 중...' : '🔍 카드 검색'}
                  </PixelText>
                </View>
              </PixelPress>
            </View>

            {/* 검색 결과 리스트 → 선택 시 등록 시트로 */}
            {manSearched && (
              <View style={{ gap: 8 }}>
                <PixelText variant="pixel" size={10} color={colors.ink3} style={{ letterSpacing: 1 }}>
                  검색 결과 {manResults.length}건
                </PixelText>
                {manResults.map((c) => (
                  <PixelPress key={c.id} onPress={() => openRegister(c, 'manual')} borderWidth={3} shadow={4}>
                    <View style={{ flexDirection: 'row', gap: 10, padding: 10, alignItems: 'center' }}>
                      <View style={{ width: 44, height: 60, borderColor: colors.ink, borderWidth: 2 }}>
                        <CardThumb card={c} height={56} emojiSize={20} showLabel={false} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <PixelText variant="ko" size={11} weight="bold">{displayCardName(c.name)}</PixelText>
                        <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: 3 }}>
                          {c.set} · {c.num}
                        </PixelText>
                        <PixelText variant="pixel" size={10} color={c.price > 0 ? colors.grnDk : colors.ink3} style={{ marginTop: 3 }}>
                          {priceLabel(c.price, inferCardCurrency(c))}
                        </PixelText>
                      </View>
                      <PixelText variant="pixel" size={10} color={colors.blu}>선택 ▶</PixelText>
                    </View>
                  </PixelPress>
                ))}
                {/* 검색에 안 잡혀도 입력값 그대로 등록 */}
                <PixelPress onPress={() => openRegister(buildManualCard(), 'manual')} bg={colors.pap2} borderWidth={3} shadow={4}>
                  <View style={{ flexDirection: 'row', gap: 10, padding: 10, alignItems: 'center' }}>
                    <View style={{ width: 44, height: 60, borderColor: colors.ink, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>✍️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <PixelText variant="pixel" size={11}>입력한 정보 그대로 등록</PixelText>
                      <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: 3 }}>
                        {manName || '무제 카드'} · {manSet || '-'} · {manNum || '-'}
                      </PixelText>
                    </View>
                    <PixelText variant="pixel" size={10} color={colors.blu}>선택 ▶</PixelText>
                  </View>
                </PixelPress>
              </View>
            )}
          </View>
        )}

        {mode === 'register' && pendingCard && (() => {
          const price = parseInt(buyPriceStr, 10);
          const preview = cardProfit(
            price > 0
              ? { ...pendingCard, buyPrice: price, buyCurrency: buyCur, qty: buyQty }
              : { ...pendingCard, qty: buyQty },
            priceMode,
          );
          return (
          <View style={{ paddingHorizontal: 14, gap: 16 }}>
            {/* 확인된 카드 (3→4단계) */}
            <PixelFrame borderWidth={3} shadow={5}>
              <View style={{ flexDirection: 'row', gap: 12, padding: 12, alignItems: 'center' }}>
                <View style={{ width: 56, height: 78, borderColor: colors.ink, borderWidth: 2 }}>
                  <CardThumb card={pendingCard} height={74} emojiSize={26} showLabel={false} />
                </View>
                <View style={{ flex: 1 }}>
                  <PixelText variant="pixel" size={10} color={colors.grn} style={{ marginBottom: 5 }}>
                    ✓ 이 카드를 등록합니다
                  </PixelText>
                  <PixelText variant="ko" size={12} weight="bold" style={{ lineHeight: 18 }}>
                    {displayCardName(pendingCard.name)}
                  </PixelText>
                  <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginTop: 3 }}>
                    {pendingCard.set} · {pendingCard.num}
                  </PixelText>
                  <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <RarBadge rar={pendingCard.rar} />
                    <PixelText variant="pixel" size={9} color={colors.ink3}>
                      현재 {priceLabel(cardProfit(pendingCard, priceMode).currentKrw, 'KRW')}
                    </PixelText>
                  </View>
                </View>
              </View>
            </PixelFrame>

            {/* 직접뽑기 토글 */}
            <ToggleRow
              on={selfPulled}
              onPress={() => setSelfPulled((v) => !v)}
              label="🎁 직접 뽑은 카드"
              hint="구매가 대신 현재시세를 기준가로 사용"
            />

            {/* 구매 시기 */}
            <View>
              <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
                📅 구매 시기
              </PixelText>
              <TextInput
                value={buyYm}
                onChangeText={setBuyYm}
                placeholder="2026-06"
                placeholderTextColor={colors.ink4}
                style={inputStyle}
              />
            </View>

            {/* 구매가 + 통화 — 직접뽑기면 현재시세 기준가 안내로 대체 */}
            {selfPulled ? (
              <View>
                <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
                  💰 기준가
                </PixelText>
                <PixelFrame borderWidth={3} bg={colors.pap3}>
                  <View style={{ padding: 12 }}>
                    <PixelText variant="pixel" size={10} color={colors.ink3} style={{ lineHeight: 16 }}>
                      현재시세 {priceLabel(cardProfit(pendingCard, priceMode).currentKrw / Math.max(1, buyQty), 'KRW')} 를
                      {`\n`}기준가로 등록합니다
                    </PixelText>
                  </View>
                </PixelFrame>
              </View>
            ) : (
              <View>
                <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
                  💰 구매가 <Text style={{ color: colors.ink3 }}>(장당)</Text>
                </PixelText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={buyPriceStr}
                    onChangeText={setBuyPriceStr}
                    placeholder={buyCur === 'JPY' ? '엔' : '원'}
                    placeholderTextColor={colors.ink4}
                    keyboardType="numeric"
                    style={[inputStyle, { flex: 1 }]}
                  />
                  {(['KRW', 'JPY'] as PriceCurrency[]).map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setBuyCur(c)}
                      style={{
                        paddingHorizontal: 16,
                        justifyContent: 'center',
                        backgroundColor: buyCur === c ? colors.gold : colors.white,
                        borderColor: colors.ink,
                        borderWidth: 3,
                      }}
                    >
                      <PixelText variant="pixel" size={12} color={buyCur === c ? colors.ink : colors.ink3}>
                        {c === 'JPY' ? '¥' : '₩'}
                      </PixelText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* 수량 */}
            <View>
              <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
                🔢 수량
              </PixelText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => setBuyQty((q) => Math.max(1, q - 1))}
                  style={qtyBtnStyle}
                >
                  <PixelText variant="pixel" size={16}>−</PixelText>
                </Pressable>
                <PixelText variant="pixel" size={15} style={{ minWidth: 40, textAlign: 'center' }}>
                  {buyQty}
                </PixelText>
                <Pressable
                  onPress={() => setBuyQty((q) => Math.min(999, q + 1))}
                  style={qtyBtnStyle}
                >
                  <PixelText variant="pixel" size={16}>＋</PixelText>
                </Pressable>
              </View>
            </View>

            {/* 등급여부 토글 + 등급사/등급 */}
            <ToggleRow
              on={graded}
              onPress={() => setGraded((v) => !v)}
              label="🏅 등급(그레이딩) 카드"
              hint="PSA/BGS 등 슬랩 카드"
            />
            {graded && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.4 }}>
                  <PixelText variant="pixel" size={10} style={{ marginBottom: 8, letterSpacing: 1 }}>
                    등급사
                  </PixelText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {['PSA', 'BGS', 'CGC', 'SGC'].map((co) => (
                      <Chip key={co} on={gradeCompany === co} onPress={() => setGradeCompany(co)} size={9} px={8} py={6}>
                        {co}
                      </Chip>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <PixelText variant="pixel" size={10} style={{ marginBottom: 8, letterSpacing: 1 }}>
                    등급
                  </PixelText>
                  <TextInput
                    value={gradeValue}
                    onChangeText={setGradeValue}
                    placeholder="10"
                    placeholderTextColor={colors.ink4}
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                </View>
              </View>
            )}

            {/* 6단계 — 수익률 실시간 미리보기 */}
            {preview.hasBuy && (
              <PixelFrame borderWidth={3} shadow={4} bg={colors.pap3}>
                <View style={{ padding: 12, gap: 6 }}>
                  <ProfitRow label="총 구매가" value={priceLabel(preview.investedKrw, 'KRW')} />
                  <ProfitRow label="현재 시세" value={priceLabel(preview.currentKrw, 'KRW')} />
                  <View style={{ height: 1, backgroundColor: colors.ink4, marginVertical: 2 }} />
                  <ProfitRow
                    label="예상 수익률"
                    value={`${preview.profitKrw >= 0 ? '+' : ''}₩${fmt(Math.abs(preview.profitKrw))} (${
                      preview.ratePct != null ? `${preview.ratePct >= 0 ? '+' : ''}${preview.ratePct.toFixed(1)}%` : '—'
                    })`}
                    color={preview.profitKrw >= 0 ? colors.grnDk : colors.red}
                    bold
                  />
                </View>
              </PixelFrame>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              <PixelPress wrapStyle={{ flex: 1 }} onPress={() => finalizeRegister(true)}>
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <PixelText variant="pixel" size={10}>건너뛰기</PixelText>
                </View>
              </PixelPress>
              <PixelPress
                wrapStyle={{ flex: 2 }}
                onPress={() => finalizeRegister(false)}
                bg={colors.gold}
                hi={colors.goldLt}
                lo={colors.goldDk}
              >
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <PixelText variant="pixel" size={11} weight="bold">컬렉션에 등록 ✓</PixelText>
                </View>
              </PixelPress>
            </View>
          </View>
          );
        })()}

        {mode === 'result' && found && (
          <>
            <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
            <PixelFrame borderWidth={4} shadow={6}>
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                padding: 14,
                alignItems: 'flex-start',
              }}
            >
              <View style={{ width: 68, height: 96, borderColor: colors.ink, borderWidth: 2 }}>
                <CardThumb card={found} height={92} emojiSize={32} showLabel={false} />
              </View>
              <View style={{ flex: 1 }}>
                <PixelText variant="pixel" size={10} color={colors.grn} style={{ marginBottom: 6 }}>
                  ✓ 인식 완료!
                </PixelText>
                <PixelText variant="pixel" size={12} style={{ marginBottom: 5, lineHeight: 18 }}>
                  {displayCardName(found.name)}
                </PixelText>
                <PixelText variant="pixel" size={9} color={colors.ink3} style={{ lineHeight: 16 }}>
                  {found.set} · {found.num}
                  {`\n`}
                  {found.game}
                </PixelText>
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <RarBadge rar={found.rar} />
                  <PixelText
                    variant="pixel"
                    size={10}
                    color={found.price > 0 ? colors.grnDk : colors.ink3}
                  >
                    {priceLabel(found.price, inferCardCurrency(found))}
                  </PixelText>
                </View>
              </View>
            </View>
            </PixelFrame>
            </View>
            {(() => {
              const p = cardProfit(found, priceMode);
              return (
                <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
                  <PixelFrame borderWidth={3} shadow={4} bg={colors.pap3}>
                    <View style={{ padding: 12, gap: 6 }}>
                      <PixelText variant="pixel" size={10} color={colors.ink3} style={{ marginBottom: 2, letterSpacing: 1 }}>
                        📈 수익률
                      </PixelText>
                      {p.hasBuy ? (
                        <>
                          <ProfitRow
                            label={`구매가${p.qty > 1 ? ` ×${p.qty}` : ''}`}
                            value={priceLabel(p.investedKrw, 'KRW')}
                          />
                          <ProfitRow label="현재 시세" value={priceLabel(p.currentKrw, 'KRW')} />
                          <View style={{ height: 1, backgroundColor: colors.ink4, marginVertical: 2 }} />
                          <ProfitRow
                            label="손익"
                            value={`${p.profitKrw >= 0 ? '+' : '-'}₩${fmt(Math.abs(p.profitKrw))} (${
                              p.ratePct != null ? `${p.ratePct >= 0 ? '+' : ''}${p.ratePct.toFixed(1)}%` : '—'
                            })`}
                            color={p.profitKrw >= 0 ? colors.grnDk : colors.red}
                            bold
                          />
                        </>
                      ) : (
                        <PixelText variant="pixel" size={10} color={colors.ink3} style={{ lineHeight: 16 }}>
                          현재 시세 {priceLabel(p.currentKrw, 'KRW')}
                          {`\n`}구매가를 입력하면 수익률이 표시됩니다
                        </PixelText>
                      )}
                    </View>
                  </PixelFrame>
                </View>
              );
            })()}
            <View style={{ marginHorizontal: 14, flexDirection: 'row', gap: 8 }}>
              <PixelPress wrapStyle={{ flex: 1 }} onPress={() => setMode('choose')}>
                <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                  <PixelText variant="pixel" size={10}>
                    처음으로
                  </PixelText>
                </View>
              </PixelPress>
              <PixelPress
                wrapStyle={{ flex: 1 }}
                onPress={() => router.push('/my/cards' as never)}
                bg={colors.gold}
                hi={colors.goldLt}
                lo={colors.goldDk}
              >
                <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                  <PixelText variant="pixel" size={10}>
                    컬렉션 추가 ✓
                  </PixelText>
                </View>
              </PixelPress>
            </View>
          </>
        )}
      </ScrollView>
      )}
    </View>
  );
}

function ToggleRow({
  on,
  onPress,
  label,
  hint,
}: {
  on: boolean;
  onPress: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        backgroundColor: on ? colors.gold : colors.white,
        borderColor: colors.ink,
        borderWidth: 3,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? colors.ink : colors.pap3,
          borderColor: colors.ink,
          borderWidth: 2,
        }}
      >
        {on && <PixelText variant="pixel" size={12} color={colors.gold}>✓</PixelText>}
      </View>
      <View style={{ flex: 1 }}>
        <PixelText variant="pixel" size={11} color={colors.ink}>
          {label}
        </PixelText>
        {hint && (
          <PixelText variant="pixel" size={8} color={on ? colors.ink2 : colors.ink3} style={{ marginTop: 3 }}>
            {hint}
          </PixelText>
        )}
      </View>
    </Pressable>
  );
}

function ProfitRow({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <PixelText variant="pixel" size={10} color={colors.ink3}>
        {label}
      </PixelText>
      <PixelText variant="pixel" size={bold ? 12 : 10} color={color ?? colors.ink} weight={bold ? 'bold' : undefined}>
        {value}
      </PixelText>
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.white,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 17,
  fontFamily: 'Galmuri11',
  color: colors.ink,
  borderColor: colors.ink,
  borderWidth: 3,
} as const;

const qtyBtnStyle = {
  width: 48,
  height: 48,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.white,
  borderColor: colors.ink,
  borderWidth: 3,
} as const;
