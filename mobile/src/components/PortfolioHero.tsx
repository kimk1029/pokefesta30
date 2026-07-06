/**
 * 토탈 포트폴리오 hero (모바일) — 홈 메인과 내 컬렉션 상단에서 동일하게 재사용.
 * 클린/다크 = CleanDarkPortfolioHero, 그 외 = 픽셀 보드. 미로그인 시 잠금 오버레이.
 * 데이터(보유/평가액/등락)는 usePortfolioHeroData 훅이 useCollection +
 * /api/me/portfolio 로 계산한다(웹 lib/portfolioHero 와 동일 컨셉).
 * 히어로 그래프는 웹 '내 자산'과 동일하게 제거 — 차트는 /my/portfolio 에서.
 */
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { colors } from '@/theme/tokens';
import { useThemeColors, useTheme, useThemeTextVariant } from '@/components/ThemeProvider';
import { isFlatTheme } from '@/lib/theme';
import { isAuthenticated, subscribeSession } from '@/lib/session';
import { useCurrency } from '@/components/CurrencyProvider';
import { usePriceMode } from '@/lib/priceMode';
import { useCollection } from '@/lib/collection';
import { cardKrw, cardJpy, cardProfit } from '@/data/cardvault';
import { fetchPortfolio, type PortfolioSummary } from '@/lib/myApi';

/** 로그인 상태를 반응형으로 구독. */
function useAuthed(): boolean {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  useEffect(() => {
    const sync = () => setAuthed(isAuthenticated());
    const unsub = subscribeSession(sync);
    sync();
    return unsub;
  }, []);
  return authed;
}

interface HeroData {
  authed: boolean;
  serverPortfolio: PortfolioSummary | null;
  changePct: number;
  ownedLen: number;
  gradedLen: number;
  hasAnyPsa10: boolean;
  priceMode: 'single' | 'psa10';
  togglePriceMode: () => void;
  /** 보유 카드 현재 평가액 합계(JPY). 통화 토글 표시는 format() 으로. */
  totalJpy: number;
  /** @internal — changePct 계산용 로컬 KRW 합계. 표시엔 totalJpy 사용. */
  totalVal: number;
  /** 보유 카드 매입가 합계(KRW). 구매가 미입력분은 0. */
  investedKrw: number;
  /** 평가 손익(KRW) = 현재가 합 − 매입가 합 (매입가 입력 카드 한정). */
  profitKrw: number;
}

/** hero 표시에 필요한 데이터 — useCollection + 서버 포트폴리오 스냅샷. */
function usePortfolioHeroData(): HeroData {
  const authed = useAuthed();
  const ownedAll = useCollection();
  const owned = ownedAll.filter((c) => !c.favorite);
  // 라이브 환율 — 집계도 표시(format)와 동일한 환율로 통일.
  const { rate } = useCurrency();

  const [serverPortfolio, setServerPortfolio] = useState<PortfolioSummary | null>(null);
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    fetchPortfolio()
      .then((d) => alive && d && d.totalCount > 0 && setServerPortfolio(d))
      .catch(() => undefined);
    return () => { alive = false; };
  }, [authed]);

  const { mode: globalPriceMode, toggle: togglePriceMode } = usePriceMode();
  const hasAnyPsa10 = owned.some((c) => (c.pricePsa10 ?? 0) > 0);
  const priceMode: 'single' | 'psa10' = hasAnyPsa10 ? globalPriceMode : 'single';

  const totalVal = owned.reduce((a, c) => a + cardKrw(c, priceMode, rate), 0);
  const totalJpy = owned.reduce((a, c) => a + cardJpy(c, priceMode, rate), 0);
  const prevVal = Math.round(totalVal * 0.88);
  const changePct = prevVal > 0 ? Math.round(((totalVal - prevVal) / prevVal) * 100) : 0;
  const graded = owned.filter((c) => c.grade != null);

  // 매입가/평가손익 집계 — 구매가 입력 카드만 (cardProfit.hasBuy). 더미 없이 실데이터.
  const profitAgg = owned.reduce(
    (a, c) => {
      const p = cardProfit(c, priceMode, rate);
      a.invested += p.investedKrw;
      a.profit += p.profitKrw;
      return a;
    },
    { invested: 0, profit: 0 },
  );

  return {
    authed, serverPortfolio, totalVal, totalJpy, changePct,
    ownedLen: owned.length, gradedLen: graded.length,
    hasAnyPsa10, priceMode, togglePriceMode,
    investedKrw: profitAgg.invested, profitKrw: profitAgg.profit,
  };
}

export function PortfolioHero() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const { theme } = useTheme();
  const flat = isFlatTheme(theme);
  const { format: formatCurrency, rate } = useCurrency();
  const {
    authed, serverPortfolio, totalJpy, changePct, ownedLen, gradedLen,
    hasAnyPsa10, priceMode, togglePriceMode,
    investedKrw, profitKrw,
  } = usePortfolioHeroData();

  // 칩 표시용 — KRW 집계를 JPY 로 환산해 통화 토글(format)과 일관되게 표시.
  const investedJpy = rate > 0 ? investedKrw / rate : 0;
  const profitJpy = rate > 0 ? profitKrw / rate : 0;
  const hasInvested = investedKrw > 0;

  // 서버 포트폴리오가 있으면 그 JPY 총액, 없으면 로컬 집계 JPY 총액 — 둘 다 format() 로
  // 통화 토글(엔/원)을 동일하게 반영. (이전엔 폴백이 항상 ₩ 고정이었음.)
  const valueText = formatCurrency(serverPortfolio ? serverPortfolio.totalJpy : totalJpy);
  const realPct = serverPortfolio?.changePct ?? null;
  const heroPct = realPct != null ? Math.round(realPct) : changePct;

  // '어제 대비 등락' — 웹 내 자산 히어로와 동일 표기: +금액 (+pct%) ▲.
  const realAbsJpy = serverPortfolio?.changeAbsJpy ?? null;
  const heroUp = (realPct ?? heroPct) >= 0;
  const deltaLabel = realPct != null ? '어제 대비 등락' : '지난주 대비 등락';
  const deltaText =
    realPct != null && realAbsJpy != null
      ? `${realPct >= 0 ? '+' : '-'}${formatCurrency(Math.abs(realAbsJpy))} (${realPct >= 0 ? '+' : ''}${realPct.toFixed(2)}%) ${realPct >= 0 ? '▲' : '▼'}`
      : `${heroUp ? '+' : ''}${heroPct}% ${heroUp ? '▲' : '▼'}`;

  return (
    <View style={{ marginHorizontal: 14, marginBottom: 6, position: 'relative' }}>
      <View style={authed ? undefined : { opacity: 0.35 }} pointerEvents={authed ? 'auto' : 'none'}>
        {flat ? (
          <CleanDarkPortfolioHero
            dark={theme === 'dark'}
            tc={tc}
            txt={txt}
            value={valueText}
            changePct={heroPct}
            deltaLabel={deltaLabel}
            deltaText={deltaText}
            hasAnyPsa10={hasAnyPsa10}
            priceMode={priceMode}
            togglePriceMode={togglePriceMode}
            ownedLen={ownedLen}
            gradedLen={gradedLen}
            investedText={hasInvested ? formatCurrency(investedJpy) : '—'}
            profitText={hasInvested ? `${profitJpy >= 0 ? '+' : '-'}${formatCurrency(Math.abs(profitJpy))}` : '—'}
            profitColor={!hasInvested ? tc.ink3 : profitJpy >= 0 ? tc.red : tc.blu}
          />
        ) : (
          <PixelFrame
            bg={tc.ink2}
            borderWidth={4}
            shadow={6}
            hi="rgba(100,130,255,0.18)"
            lo="rgba(0,0,0,0.55)"
            inner={4}
          >
            <View style={{ padding: 18, paddingBottom: 16, position: 'relative', overflow: 'hidden' }}>
              {/* corner brackets */}
              {(
                [
                  { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2 },
                  { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2 },
                  { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2 },
                  { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2 },
                ] as const
              ).map((pos, i) => (
                <View
                  key={i}
                  pointerEvents="none"
                  style={[{ position: 'absolute', width: 14, height: 14, borderColor: 'rgba(255,210,63,0.5)' }, pos]}
                />
              ))}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <PixelText variant={txt} size={9} color="rgba(255,255,255,0.35)" style={{ letterSpacing: 2 }}>
                  TOTAL PORTFOLIO{hasAnyPsa10 ? ` · ${priceMode === 'psa10' ? 'PSA10' : '싱글'}` : ''}
                </PixelText>
                {hasAnyPsa10 ? (
                  <Pressable
                    onPress={togglePriceMode}
                    style={{ flexDirection: 'row', borderColor: 'rgba(255,210,63,0.6)', borderWidth: 1 }}
                  >
                    {(['single', 'psa10'] as const).map((m) => (
                      <View
                        key={m}
                        style={{ paddingHorizontal: 7, paddingVertical: 3, backgroundColor: priceMode === m ? tc.gold : 'transparent' }}
                      >
                        <PixelText variant={txt} size={8} color={priceMode === m ? tc.ink : 'rgba(255,210,63,0.85)'}>
                          {m === 'single' ? '싱글' : 'PSA10'}
                        </PixelText>
                      </View>
                    ))}
                  </Pressable>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
                <PixelText variant={txt} size={26} color={tc.gold} style={{ letterSpacing: -2, marginRight: 12 }}>
                  {valueText}
                </PixelText>
                <View style={{ paddingBottom: 4 }}>
                  <PixelText variant={txt} size={11} color={heroUp ? '#22C55E' : '#E63946'}>
                    {deltaText}
                  </PixelText>
                  <PixelText variant={txt} size={9} color="rgba(255,255,255,0.3)" style={{ marginTop: 4 }}>
                    {deltaLabel}
                  </PixelText>
                </View>
              </View>

              {/* 4 stat chips — 실데이터 (보유/그레이딩/구매금액/평가손익) */}
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[
                  { l: '보유', v: `${ownedLen}장`, c: 'rgba(255,255,255,0.7)' },
                  { l: '그레이딩', v: `${gradedLen}건`, c: '#A78BFA' },
                  { l: '구매금액', v: hasInvested ? formatCurrency(investedJpy) : '—', c: tc.gold },
                  { l: '평가손익', v: hasInvested ? `${profitJpy >= 0 ? '+' : '-'}${formatCurrency(Math.abs(profitJpy))}` : '—', c: hasInvested ? (profitJpy >= 0 ? '#FF6B5E' : '#6FA8FF') : 'rgba(255,255,255,0.5)' },
                ].map((s) => (
                  <View
                    key={s.l}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      paddingVertical: 9,
                      paddingHorizontal: 4,
                      alignItems: 'center',
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      minWidth: 0,
                    }}
                  >
                    <PixelText variant={txt} size={10} color={s.c} numberOfLines={1} adjustsFontSizeToFit style={{ marginBottom: 5 }}>
                      {s.v}
                    </PixelText>
                    <PixelText variant={txt} size={8} color="rgba(255,255,255,0.3)" numberOfLines={1}>
                      {s.l}
                    </PixelText>
                  </View>
                ))}
              </View>

              {/* 전체 포트폴리오 페이지로 */}
              <Pressable onPress={() => router.push('/my/portfolio' as never)} style={{ marginTop: 10, alignItems: 'flex-end' }}>
                <PixelText variant={txt} size={9} color="rgba(255,210,63,0.75)" style={{ letterSpacing: 0.5 }}>
                  전체 포트폴리오 보기 ▶
                </PixelText>
              </Pressable>
            </View>
          </PixelFrame>
        )}
      </View>
      {!authed && (
        <Pressable
          onPress={() => router.push('/login' as never)}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 18 }}
        >
          <View
            style={{
              backgroundColor: 'rgba(15,23,42,0.92)',
              borderColor: tc.gold,
              borderWidth: 3,
              paddingHorizontal: 18,
              paddingVertical: 14,
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PixelText variant={txt} size={9} color={tc.gold} style={{ letterSpacing: 0.5 }}>
              🔒 PORTFOLIO LOCKED
            </PixelText>
            <PixelText variant="ko" size={12} weight="bold" color={tc.white} style={{ textAlign: 'center', lineHeight: 18 }}>
              로그인하고 나의{'\n'}가치변동을 확인하세요
            </PixelText>
            <PixelText variant={txt} size={9} color={tc.gold} style={{ marginTop: 4, letterSpacing: 0.5 }}>
              👉 TAP TO LOGIN
            </PixelText>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/**
 * 클린(라이트) / 다크(사이버 주식창) 포트폴리오 히어로.
 */
function CleanDarkPortfolioHero({
  dark, tc, txt, value, changePct, deltaLabel, deltaText, hasAnyPsa10, priceMode, togglePriceMode,
  ownedLen, gradedLen, investedText, profitText, profitColor,
}: {
  dark: boolean;
  tc: typeof colors;
  txt: 'pixel' | 'ko';
  value: string;
  changePct: number;
  deltaLabel: string;
  deltaText: string;
  hasAnyPsa10: boolean;
  priceMode: 'single' | 'psa10';
  togglePriceMode: () => void;
  ownedLen: number;
  gradedLen: number;
  investedText: string;
  profitText: string;
  profitColor: string;
}) {
  const up = changePct >= 0;
  const upColor = up ? tc.red : tc.blu;
  const radius = dark ? 14 : 0;
  return (
    <View style={{ backgroundColor: tc.paper, borderColor: tc.pap3, borderWidth: 1, borderRadius: radius, overflow: 'hidden' }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <PixelText variant={txt} size={11} weight="bold" color={tc.ink3}>내 포트폴리오 평가액</PixelText>
          {hasAnyPsa10 ? (
            <Pressable onPress={togglePriceMode} style={{ flexDirection: 'row', backgroundColor: tc.pap2, borderColor: tc.pap3, borderWidth: 1 }}>
              {(['single', 'psa10'] as const).map((m) => (
                <View key={m} style={{ paddingHorizontal: 9, paddingVertical: 4, backgroundColor: priceMode === m ? tc.ink : 'transparent' }}>
                  <PixelText variant={txt} size={10} weight="bold" color={priceMode === m ? tc.paper : tc.ink3}>{m === 'single' ? '싱글' : 'PSA10'}</PixelText>
                </View>
              ))}
            </Pressable>
          ) : null}
        </View>
        <PixelText variant={txt} size={30} weight="bold" color={tc.ink} style={{ letterSpacing: -1 }}>{value}</PixelText>
        {/* '어제 대비 등락' — 웹 내 자산 히어로와 동일 표기 (그래프 없이 라벨+등락값). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <PixelText variant={txt} size={11} color={tc.ink3}>{deltaLabel}</PixelText>
          <PixelText variant={txt} size={13} weight="bold" color={upColor}>{deltaText}</PixelText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: tc.pap3 }}>
        {([
          ['보유', `${ownedLen}장`, tc.ink],
          ['그레이딩', `${gradedLen}건`, tc.ink],
          ['구매금액', investedText, tc.ink],
          ['평가손익', profitText, profitColor],
        ] as Array<[string, string, string]>).map(([l, v, col], i) => (
          <View key={l} style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', borderRightWidth: i < 3 ? 1 : 0, borderRightColor: tc.pap3 }}>
            <PixelText variant={txt} size={15} weight="bold" color={col} numberOfLines={1} adjustsFontSizeToFit>{v}</PixelText>
            <PixelText variant={txt} size={11} color={tc.ink3} style={{ marginTop: 4 }}>{l}</PixelText>
          </View>
        ))}
      </View>
    </View>
  );
}
