import { useEffect, useState } from 'react';
import { ScrollView, View, Pressable, TextInput, Text } from 'react-native';
import { router } from 'expo-router';
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
import { CARDS, GAMES, fmt, priceLabel, displayCardName, inferCardCurrency, type CardItem, type Game, type Rarity } from '@/data/cardvault';
import { addCards } from '@/lib/collection';
import type { GuideRect, ScanLanguage } from '@/types/cardScan';

type Mode = 'choose' | 'camera' | 'preview' | 'batch' | 'manual' | 'result' | 'batchResult';

export default function ScanScreen() {
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
  const [manName, setManName] = useState('');
  const [manSet, setManSet] = useState('');
  const [manNum, setManNum] = useState('');
  const [manGame, setManGame] = useState<Game>('포켓몬');
  const [manRar, setManRar] = useState<Rarity>('R');
  const [manPrice, setManPrice] = useState('');

  const submitManual = () => {
    const card: CardItem = {
      id: Date.now(),
      name: manName || '무제 카드',
      set: manSet || '-',
      num: manNum || '-',
      game: manGame,
      rar: manRar,
      grade: null,
      price: parseInt(manPrice) || 0,
      trend: [parseInt(manPrice) || 0],
      emoji: '🃏',
      owned: true,
    };
    addCards([card]);
    setFound(card);
    setMode('result');
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
            router.replace('/cards' as never);
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
          onConfirm={(card) => {
            addCards([card]);
            setFound(card);
            setMode('result');
          }}
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
              onPress={() => router.push('/cards' as never)}
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
                📛 카드명 <Text style={{ color: colors.red }}>*</Text>
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
                  세트명
                </PixelText>
                <TextInput
                  value={manSet}
                  onChangeText={setManSet}
                  placeholder="세트"
                  placeholderTextColor={colors.ink4}
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <PixelText variant="pixel" size={10} style={{ marginBottom: 8, letterSpacing: 1 }}>
                  카드 번호
                </PixelText>
                <TextInput
                  value={manNum}
                  onChangeText={setManNum}
                  placeholder="006/165"
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

            <View>
              <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
                💰 구매가
              </PixelText>
              <TextInput
                value={manPrice}
                onChangeText={setManPrice}
                placeholder="원"
                placeholderTextColor={colors.ink4}
                keyboardType="numeric"
                style={inputStyle}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <PixelPress wrapStyle={{ flex: 1 }} onPress={() => setMode('choose')}>
                <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                  <PixelText variant="pixel" size={11}>
                    ← 뒤로
                  </PixelText>
                </View>
              </PixelPress>
              <PixelPress
                wrapStyle={{ flex: 1 }}
                onPress={submitManual}
                disabled={!manName}
                bg={manName ? colors.gold : colors.pap3}
                hi={manName ? colors.goldLt : null}
                lo={manName ? colors.goldDk : null}
              >
                <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                  <PixelText variant="pixel" size={11}>
                    등록하기 ✓
                  </PixelText>
                </View>
              </PixelPress>
            </View>
          </View>
        )}

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
                onPress={() => router.push('/cards' as never)}
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
