import { useState } from 'react';
import { ScrollView, View, Pressable, TextInput, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar, ABtn } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { CardThumb } from '@/components/cv/CardThumb';
import { RarBadge } from '@/components/cv/RarBadge';
import { GradeBadge } from '@/components/cv/GradeBadge';
import { Seg } from '@/components/cv/Seg';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { fmt, priceLabel, type CardItem } from '@/data/cardvault';
import { useCollection } from '@/lib/collection';

type Tab = 'info' | 'grade' | 'price' | 'sell';
type GradeResult = {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  score: number;
};

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const collection = useCollection();
  const card = collection.find((c) => String(c.id) === String(id)) as CardItem | undefined;
  const [tab, setTab] = useState<Tab>('info');
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  if (!card) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <AppBar onBack={() => router.back()} title="카드 없음" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText variant="pixel" size={11} color={colors.ink3}>
            카드를 찾을 수 없어요
          </PixelText>
        </View>
      </View>
    );
  }

  const runGrade = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const c = 7 + Math.random() * 3;
      const e = 7 + Math.random() * 3;
      const ed = 7 + Math.random() * 3;
      const s = 7 + Math.random() * 3;
      const avg = (c + e + ed + s) / 4;
      setGradeResult({
        centering: +c.toFixed(1),
        corners: +e.toFixed(1),
        edges: +ed.toFixed(1),
        surface: +s.toFixed(1),
        score: +avg.toFixed(1),
      });
      setAnalyzing(false);
    }, 1800);
  };

  const max = Math.max(...card.trend);
  const min = Math.min(...card.trend);
  const change = card.trend[card.trend.length - 1] - card.trend[0];
  const changePct = Math.round((change / card.trend[0]) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title={card.name} right={<ABtn>🏷</ABtn>} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}>
        {/* Hero card image */}
        <View style={{ marginHorizontal: 14 }}>
          <PixelFrame borderWidth={4} shadow={7} hi={null} lo={null}>
            <View style={{ height: 180, position: 'relative' }}>
              <CardThumb card={card} height={172} emojiSize={64} />
              {card.grade ? (
                <View style={{ position: 'absolute', top: 10, right: 10 }}>
                  <GradeBadge g={card.grade} />
                </View>
              ) : null}
              <View style={{ position: 'absolute', top: 10, left: 10 }}>
                <RarBadge rar={card.rar} />
              </View>
            </View>
          </PixelFrame>
        </View>

        {/* Quick info chips */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginHorizontal: 14,
            marginTop: 14,
            marginBottom: 12,
          }}
        >
          {[
            ['세트', card.set],
            ['번호', card.num],
            ['게임', card.game],
          ].map(([l, v]) => (
            <View
              key={l}
              style={{
                flex: 1,
                backgroundColor: colors.white,
                paddingHorizontal: 8,
                paddingVertical: 9,
                alignItems: 'center',
                borderColor: colors.ink,
                borderWidth: 2,
              }}
            >
              <PixelText variant="pixel" size={8} color={colors.ink3} style={{ marginBottom: 4 }}>
                {l}
              </PixelText>
              <PixelText variant="pixel" size={9} numberOfLines={1} style={{ textAlign: 'center', lineHeight: 14 }}>
                {v}
              </PixelText>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
          <Seg
            value={tab}
            onChange={(t) => setTab(t)}
            tabs={[
              { id: 'info', label: '정보' },
              { id: 'grade', label: '그레이딩' },
              { id: 'price', label: '시세' },
              { id: 'sell', label: '판매' },
            ]}
            size={9}
          />
        </View>

        {tab === 'info' && (
          <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
            {[
              ['카드명', card.name],
              ['세트', card.set],
              ['번호', card.num],
              ['게임', card.game],
              ['희귀도', card.rar],
              ['등급', card.grade ? `PSA ${card.grade}` : '미그레이딩'],
              ['현재 시세', `₩${card.price.toLocaleString()}`],
            ].map(([l, v], i) => (
              <View
                key={l}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 11,
                  borderBottomWidth: 2,
                  borderBottomColor: colors.pap3,
                }}
              >
                <PixelText variant="pixel" size={10} color={colors.ink3}>
                  {l}
                </PixelText>
                <PixelText variant="pixel" size={10}>
                  {v}
                </PixelText>
              </View>
            ))}
          </View>
        )}

        {tab === 'grade' && (
          <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
            <PixelFrame bg={colors.pap2} borderWidth={3}>
            <View style={{ padding: 14 }}>
              <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 0.5 }}>
                📷 AI 모의 그레이딩
              </PixelText>
              <PixelText variant="pixel" size={9} color={colors.ink3} style={{ marginBottom: 12, lineHeight: 18 }}>
                카드 상태를 AI가 센터링·코너·엣지·표면 4항목으로 PSA 점수를 예측합니다
              </PixelText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PixelPress wrapStyle={{ flex: 1 }}>
                  <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                    <PixelText variant="pixel" size={10}>
                      📷 사진 촬영
                    </PixelText>
                  </View>
                </PixelPress>
                <PixelPress
                  wrapStyle={{ flex: 1 }}
                  onPress={runGrade}
                  disabled={analyzing}
                  bg={colors.gold}
                  hi={colors.goldLt}
                  lo={colors.goldDk}
                >
                  <View style={{ paddingVertical: 10, alignItems: 'center', opacity: analyzing ? 0.6 : 1 }}>
                    <PixelText variant="pixel" size={10}>
                      {analyzing ? '분석 중...' : '▶ 분석 시작'}
                    </PixelText>
                  </View>
                </PixelPress>
              </View>
            </View>
            </PixelFrame>
            {analyzing ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <PixelText variant="pixel" size={11} color={colors.ink3} style={{ lineHeight: 22, textAlign: 'center' }}>
                  AI 분석 중...{`\n`}잠시만 기다려주세요 🔍
                </PixelText>
              </View>
            ) : null}
            {gradeResult ? (
              <>
                <View style={{ marginTop: 12, marginBottom: 12 }}>
                <PixelFrame
                  bg={colors.ink2}
                  borderWidth={4}
                  shadow={6}
                  hi="rgba(255,255,255,0.1)"
                  lo="rgba(0,0,0,0.4)"
                  inner={4}
                >
                <View style={{ padding: 16 }}>
                  <PixelText
                    variant="pixel"
                    size={42}
                    color={colors.gold}
                    style={{ textAlign: 'center', letterSpacing: -2, marginBottom: 4 }}
                  >
                    {gradeResult.score}
                  </PixelText>
                  <PixelText
                    variant="pixel"
                    size={11}
                    color="rgba(255,255,255,0.6)"
                    style={{ textAlign: 'center', letterSpacing: 1, marginBottom: 14 }}
                  >
                    {gradeResult.score >= 9.5
                      ? 'PSA 10 ★ 잠재'
                      : gradeResult.score >= 8.5
                        ? 'PSA 9 우수'
                        : gradeResult.score >= 7.5
                          ? 'PSA 8 양호'
                          : 'PSA 7 이하'}
                  </PixelText>
                  {(
                    [
                      ['센터링', gradeResult.centering, '#22C55E'],
                      ['코너', gradeResult.corners, '#3A5BD9'],
                      ['엣지', gradeResult.edges, '#7C3AED'],
                      ['표면', gradeResult.surface, '#F97316'],
                    ] as const
                  ).map(([nm, val, col]) => (
                    <View
                      key={nm}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}
                    >
                      <PixelText variant="pixel" size={10} color="rgba(255,255,255,0.6)" style={{ width: 48 }}>
                        {nm}
                      </PixelText>
                      <View
                        style={{
                          flex: 1,
                          height: 11,
                          backgroundColor: colors.ink,
                          borderColor: colors.ink,
                          borderWidth: 1,
                        }}
                      >
                        <View style={{ width: `${val * 10}%`, height: '100%', backgroundColor: col }} />
                      </View>
                      <PixelText variant="pixel" size={10} color={col} style={{ width: 22, textAlign: 'right' }}>
                        {val}
                      </PixelText>
                    </View>
                  ))}
                </View>
                </PixelFrame>
                </View>
                <PixelFrame bg={colors.pap2} borderWidth={2}>
                  <View style={{ padding: 12 }}>
                    <PixelText variant="pixel" size={9} color={colors.ink2} style={{ lineHeight: 18 }}>
                      💡 PSA {Math.round(gradeResult.score)} 예상 — 참고용 수치입니다. 공식 그레이딩은 PSA/BGS에 의뢰하세요.
                    </PixelText>
                  </View>
                </PixelFrame>
              </>
            ) : null}
          </View>
        )}

        {tab === 'price' && (
          <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
            <PixelFrame
              bg={colors.ink2}
              borderWidth={4}
              shadow={5}
              hi="rgba(255,255,255,0.1)"
              lo="rgba(0,0,0,0.4)"
              inner={3}
            >
            <View style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View>
                  <PixelText variant="pixel" size={20} color={colors.gold}>
                    {priceLabel(card.price)}
                  </PixelText>
                  <PixelText
                    variant="pixel"
                    size={11}
                    color={change >= 0 ? colors.grn : colors.red}
                    style={{ marginTop: 6 }}
                  >
                    {change >= 0 ? '▲' : '▼'} {Math.abs(changePct)}% (7일)
                  </PixelText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.4)">
                    최고
                  </PixelText>
                  <PixelText variant="pixel" size={11} color={colors.gold} style={{ marginTop: 4 }}>
                    ₩{fmt(max)}
                  </PixelText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', height: 60, alignItems: 'flex-end', gap: 4 }}>
                {card.trend.map((v, i) => {
                  const h = Math.round(((v - min) / (max - min || 1)) * 100 + 20);
                  const isLast = i === card.trend.length - 1;
                  return (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        minHeight: 4,
                        height: `${h}%`,
                        backgroundColor: isLast ? colors.gold : colors.ink3,
                      }}
                    />
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                {['-6일', '-5일', '-4일', '-3일', '-2일', '어제', '오늘'].map((l) => (
                  <PixelText key={l} variant="pixel" size={9} color={colors.pap3}>
                    {l}
                  </PixelText>
                ))}
              </View>
            </View>
            </PixelFrame>
          </View>
        )}

        {tab === 'sell' && (
          <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
            <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
              판매 방식
            </PixelText>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {[
                ['즉시 판매', colors.red, colors.white],
                ['교환', colors.teal, colors.white],
                ['경매', colors.gold, colors.ink],
              ].map(([lb, bg, fg]) => (
                <View
                  key={lb}
                  style={{
                    flex: 1,
                    backgroundColor: bg as string,
                    paddingVertical: 12,
                    alignItems: 'center',
                    borderColor: colors.ink,
                    borderWidth: 2,
                  }}
                >
                  <PixelText variant="pixel" size={10} color={fg as string}>
                    {lb}
                  </PixelText>
                </View>
              ))}
            </View>
            <PixelText variant="pixel" size={11} style={{ marginBottom: 8, letterSpacing: 1 }}>
              희망 가격
            </PixelText>
            <TextInput
              keyboardType="numeric"
              placeholder={`시세: ₩${card.price.toLocaleString()}`}
              placeholderTextColor={colors.ink4}
              style={{
                backgroundColor: colors.white,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 17,
                fontFamily: 'Galmuri11',
                color: colors.ink,
                borderColor: colors.ink,
                borderWidth: 3,
                marginBottom: 14,
              }}
            />
            <PixelPress
              bg={colors.gold}
              hi={colors.goldLt}
              lo={colors.goldDk}
            >
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <PixelText variant="pixel" size={12}>
                  🏷 마켓에 등록하기
                </PixelText>
              </View>
            </PixelPress>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
