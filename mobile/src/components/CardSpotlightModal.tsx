import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { PixelText } from './PixelText';
import { colors } from '@/theme/tokens';
import { fetchDominantNeon } from '@/services/cardScanApi';
import { autoPriceSize } from '../../../shared/util/autoPriceSize';

const DEFAULT_NEON = '#22F58C';

/**
 * 카드 스포트라이트 (v2) — 카드 이미지가 컨테이너이고 그 위에 위/아래 그라데이션
 * 딤을 깔고 카드명·시세·등락률·그래프를 오버레이로 표시. 카드 한 장이 모든
 * 정보를 담는 "하이라이트 샷".
 *
 * 애니메이션: 카드가 origin 위치(작게)에서 시작 → scale 1 + rotateY 720°
 * + opacity 1 로 850ms (bouncy cubic-bezier). 닫기는 즉시 백그라운드 fade
 * 시작 + 카드 fly-back, 280ms 후 강제 unmount (안전망).
 *
 * 웹 [[src/components/CardSpotlightModal.tsx]] 와 시각/UX 1:1 매칭.
 */

export interface CardSpotlightData {
  imageUrl: string | null;
  emojiFallback?: string;
  name: string;
  subtitle?: string | null;
  gradeLabel?: string | null;
  priceLabel: string | null;
  trend: number[];
  currencySymbol?: string;
}

export interface SpotlightOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  data: CardSpotlightData | null;
  origin: SpotlightOrigin | null;
  onClose: () => void;
}

const OPEN_MS = 850;
const CLOSE_MS = 280;

export function CardSpotlightModal({ data, origin, onClose }: Props) {
  const screen = Dimensions.get('window');
  const cardW = Math.min(screen.width * 0.86, 380);
  const cardH = Math.min(cardW * (88 / 63), screen.height * 0.88);

  // 네온 글로우 펄싱 — opacity 0.55 ↔ 1 사이를 2.6s 마다 왕복.
  const neon = useRef(new Animated.Value(0)).current;
  // 카드 이미지의 dominant 네온 색 (서버 분석). 도착 전엔 기본 그린.
  const [neonColor, setNeonColor] = useState<string>(DEFAULT_NEON);

  // FLIP 보간용 Animated Values.
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotY = useRef(new Animated.Value(0)).current; // 0..1 → 0°..720°
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const topOpacity = useRef(new Animated.Value(0)).current;
  const topY = useRef(new Animated.Value(-8)).current;
  const botOpacity = useRef(new Animated.Value(0)).current;
  const botY = useRef(new Animated.Value(12)).current;

  const [cardLayout, setCardLayout] = useState<{ x: number; y: number } | null>(null);
  const closingRef = useRef(false);
  const [, setClosingTick] = useState(0);

  const originRef = useRef<SpotlightOrigin | null>(origin);
  useEffect(() => {
    if (data) originRef.current = origin;
  }, [data, origin]);

  /* 카드 이미지 dominant 네온 색 fetch — imageUrl 바뀔 때마다 */
  useEffect(() => {
    if (!data?.imageUrl) {
      setNeonColor(DEFAULT_NEON);
      return;
    }
    let cancelled = false;
    setNeonColor(DEFAULT_NEON); // 새 카드 떴을 때 일단 기본색
    fetchDominantNeon(data.imageUrl).then((hex) => {
      if (!cancelled && hex) setNeonColor(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [data?.imageUrl]);

  /* 네온 펄싱 — 모달 열려 있는 동안 계속 ↺ */
  useEffect(() => {
    if (!data) return;
    neon.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(neon, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(neon, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  /* 마운트 후 카드 최종 위치 측정되면 → origin 으로 reset → tween → final */
  useEffect(() => {
    if (!data || !cardLayout) return;
    const o = originRef.current;

    // 백그라운드 fade
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // 카드 origin 위치/스케일 reset
    if (o) {
      const finalCx = cardLayout.x + cardW / 2;
      const finalCy = cardLayout.y + cardH / 2;
      const originCx = o.x + o.width / 2;
      const originCy = o.y + o.height / 2;
      const s = o.width / cardW;
      tx.setValue(originCx - finalCx);
      ty.setValue(originCy - finalCy);
      scale.setValue(Math.max(0.04, s));
      rotY.setValue(0);
      cardOpacity.setValue(0.4);
    } else {
      tx.setValue(0);
      ty.setValue(0);
      scale.setValue(0.7);
      rotY.setValue(0);
      cardOpacity.setValue(0);
    }

    topOpacity.setValue(0);
    topY.setValue(-8);
    botOpacity.setValue(0);
    botY.setValue(12);

    // 카드 펼치기 — bouncy easing + 720° 회전
    const cardSpring = Animated.parallel([
      Animated.timing(tx, { toValue: 0, duration: OPEN_MS, easing: Easing.bezier(0.16, 1.18, 0.32, 1), useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: OPEN_MS, easing: Easing.bezier(0.16, 1.18, 0.32, 1), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: OPEN_MS, easing: Easing.bezier(0.16, 1.18, 0.32, 1), useNativeDriver: true }),
      Animated.timing(rotY, { toValue: 1, duration: OPEN_MS, easing: Easing.bezier(0.16, 1.18, 0.32, 1), useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: OPEN_MS * 0.5, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);

    // 카드가 펼쳐지는 동안 상/하 오버레이 텍스트 들이닥침
    const overlayIn = Animated.parallel([
      Animated.sequence([
        Animated.delay(250),
        Animated.parallel([
          Animated.timing(topOpacity, { toValue: 1, duration: 520, easing: Easing.bezier(0.2, 0.9, 0.3, 1), useNativeDriver: true }),
          Animated.timing(topY, { toValue: 0, duration: 520, easing: Easing.bezier(0.2, 0.9, 0.3, 1), useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(380),
        Animated.parallel([
          Animated.timing(botOpacity, { toValue: 1, duration: 520, easing: Easing.bezier(0.2, 0.9, 0.3, 1), useNativeDriver: true }),
          Animated.timing(botY, { toValue: 0, duration: 520, easing: Easing.bezier(0.2, 0.9, 0.3, 1), useNativeDriver: true }),
        ]),
      ]),
    ]);

    Animated.parallel([cardSpring, overlayIn]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, cardLayout]);

  /* Android 뒤로가기 = 닫기 */
  useEffect(() => {
    if (!data) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      startClose();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const startClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosingTick((n) => n + 1);

    const o = originRef.current;
    const anims: Animated.CompositeAnimation[] = [];

    anims.push(
      Animated.timing(bgOpacity, { toValue: 0, duration: CLOSE_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(topOpacity, { toValue: 0, duration: CLOSE_MS * 0.7, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(botOpacity, { toValue: 0, duration: CLOSE_MS * 0.7, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    );

    if (cardLayout && o) {
      const finalCx = cardLayout.x + cardW / 2;
      const finalCy = cardLayout.y + cardH / 2;
      const originCx = o.x + o.width / 2;
      const originCy = o.y + o.height / 2;
      const s = o.width / cardW;
      anims.push(
        Animated.timing(tx, { toValue: originCx - finalCx, duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ty, { toValue: originCy - finalCy, duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scale, { toValue: Math.max(0.04, s), duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rotY, { toValue: 0, duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 0, duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      );
    } else {
      anims.push(
        Animated.timing(scale, { toValue: 0.7, duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 0, duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      );
    }

    Animated.parallel(anims).start();

    // 안전망 — transition 콜백 누락에 대비, 무조건 unmount 보장.
    window.setTimeout(() => {
      closingRef.current = false;
      setCardLayout(null);
      onClose();
    }, CLOSE_MS + 30);
  }, [cardLayout, cardW, cardH, onClose, bgOpacity, topOpacity, botOpacity, tx, ty, scale, rotY, cardOpacity]);

  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    setCardLayout({ x, y });
  }, []);

  const change = useMemo(() => (data ? changeFromTrend(data.trend) : null), [data]);

  if (!data) return null;

  const rotateInterpolate = rotY.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });
  // 네온 펄싱 — iOS shadowOpacity 와 Android elevation 양쪽으로 보간.
  const neonShadowOpacity = neon.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const neonShadowRadius = neon.interpolate({ inputRange: [0, 1], outputRange: [16, 28] });
  const neonElevation = neon.interpolate({ inputRange: [0, 1], outputRange: [18, 32] });

  return (
    <Modal
      visible={!!data}
      transparent
      animationType="none"
      onRequestClose={startClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: bgOpacity }]}>
        {/* 백드롭 탭 = 닫기 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={startClose} />

        <View style={styles.center} pointerEvents="box-none">
          {/* 카드 본체 — FLIP 대상. 내부 탭은 닫히지 않게 onStartShouldSetResponder 로 흡수.
              그린 네온 보더 + 펄싱 글로우. */}
          <Animated.View
            onLayout={onCardLayout}
            onStartShouldSetResponder={() => true}
            style={[
              styles.card,
              {
                width: cardW,
                height: cardH,
                opacity: cardOpacity,
                // 카드 이미지에서 추출한 dominant 네온 색 적용.
                borderColor: neonColor,
                shadowColor: neonColor,
                shadowOpacity: neonShadowOpacity,
                shadowRadius: neonShadowRadius,
                elevation: neonElevation,
                transform: [
                  { translateX: tx },
                  { translateY: ty },
                  { perspective: 1400 },
                  { rotateY: rotateInterpolate },
                  { scale },
                ],
              },
            ]}
          >
            {/* 이미지 */}
            {data.imageUrl ? (
              <Image
                source={{ uri: data.imageUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.fallback]}>
                <PixelText variant="pixel" size={110} color={colors.gold}>
                  {data.emojiFallback ?? '🃏'}
                </PixelText>
              </View>
            )}

            {/* 상단 그라데이션 + 카드명 — RN 에는 CSS gradient 없어 SVG defs 로 */}
            <View pointerEvents="none" style={styles.topOverlay}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="cv-top" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#000" stopOpacity="0.82" />
                    <Stop offset="60%" stopColor="#000" stopOpacity="0.55" />
                    <Stop offset="100%" stopColor="#000" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Path
                  d={`M0,0 L${cardW},0 L${cardW},${cardH * 0.45} L0,${cardH * 0.45} Z`}
                  fill="url(#cv-top)"
                />
              </Svg>
            </View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.topContent,
                { opacity: topOpacity, transform: [{ translateY: topY }] },
              ]}
            >
              <PixelText variant="pixel" size={9} color={colors.gold} style={{ letterSpacing: 1, marginBottom: 4 }}>
                ★ CARD HIGHLIGHT
              </PixelText>
              <PixelText
                variant="ko"
                size={18}
                weight="bold"
                color={colors.white}
                style={{ lineHeight: 22 }}
              >
                {data.name}
              </PixelText>
              {(data.subtitle || data.gradeLabel) && (
                <PixelText
                  variant="pixel"
                  size={10}
                  color="rgba(255,255,255,0.85)"
                  style={{ marginTop: 4, letterSpacing: 0.3 }}
                >
                  {[data.subtitle, data.gradeLabel].filter(Boolean).join(' · ')}
                </PixelText>
              )}
            </Animated.View>

            {/* X 닫기 — border 없이 어두운 원 + 흰색 ✕ + 글로우 */}
            <Pressable
              onPress={startClose}
              accessibilityLabel="닫기"
              style={styles.closeBtn}
              hitSlop={8}
            >
              <PixelText
                variant="pixel"
                size={16}
                color="#FFFFFF"
                weight="bold"
                style={{
                  textShadowColor: 'rgba(255,255,255,0.7)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 6,
                }}
              >
                ✕
              </PixelText>
            </Pressable>

            {/* 하단 그라데이션 + 차트 + 가격 + 등락 */}
            <View pointerEvents="none" style={styles.botOverlay}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="cv-bot" x1="0" y1="1" x2="0" y2="0">
                    <Stop offset="0%" stopColor="#000" stopOpacity="0.95" />
                    <Stop offset="40%" stopColor="#000" stopOpacity="0.8" />
                    <Stop offset="80%" stopColor="#000" stopOpacity="0.4" />
                    <Stop offset="100%" stopColor="#000" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Path
                  d={`M0,0 L${cardW},0 L${cardW},${cardH * 0.55} L0,${cardH * 0.55} Z`}
                  fill="url(#cv-bot)"
                />
              </Svg>
            </View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.botContent,
                { opacity: botOpacity, transform: [{ translateY: botY }] },
              ]}
            >
              {data.trend.length >= 2 ? (
                <CardOverlayChart points={data.trend} width={cardW - 32} height={70} />
              ) : null}

              <View style={styles.priceRow}>
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                  <PixelText
                    variant="pixel"
                    size={9}
                    color="rgba(255,210,63,0.85)"
                    numberOfLines={1}
                    style={{ letterSpacing: 0.5, marginBottom: 3 }}
                  >
                    CURRENT
                  </PixelText>
                  <PixelText
                    variant="pixel"
                    size={autoPriceSize(data.priceLabel, 22, 12)}
                    weight="bold"
                    color={colors.gold}
                    numberOfLines={1}
                  >
                    {data.priceLabel ?? '시세 없음'}
                  </PixelText>
                </View>
                {change && (
                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <PixelText
                      variant="pixel"
                      size={9}
                      color="rgba(255,255,255,0.75)"
                      numberOfLines={1}
                      style={{ letterSpacing: 0.5, marginBottom: 3 }}
                    >
                      전일 대비
                    </PixelText>
                    <PixelText
                      variant="pixel"
                      size={16}
                      weight="bold"
                      color={CHANGE_TONE[change.dir]}
                      numberOfLines={1}
                    >
                      {CHANGE_ARROW[change.dir]} {Math.abs(change.pct).toFixed(1)}%
                    </PixelText>
                  </View>
                )}
              </View>

              <PixelText
                variant="pixel"
                size={8}
                color="rgba(255,255,255,0.55)"
                style={{ marginTop: 10, textAlign: 'center', letterSpacing: 0.5 }}
              >
                탭/뒤로가기 닫기
              </PixelText>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

/* ----------------------- helpers ------------------------- */

const CHANGE_ARROW: Record<'up' | 'down' | 'flat', string> = { up: '▲', down: '▼', flat: '–' };
const CHANGE_TONE: Record<'up' | 'down' | 'flat', string> = {
  up: '#FF6B7E',
  down: '#7EB6FF',
  flat: 'rgba(255,255,255,0.7)',
};

function changeFromTrend(trend: number[]): { pct: number; dir: 'up' | 'down' | 'flat' } | null {
  if (!Array.isArray(trend) || trend.length < 2) return null;
  const prev = trend[trend.length - 2];
  const last = trend[trend.length - 1];
  if (!(prev > 0)) return null;
  const pct = ((last - prev) / prev) * 100;
  const dir: 'up' | 'down' | 'flat' = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, dir };
}

/**
 * 카드 위에 얹는 area 차트 — area 는 골드 그라데이션, 라인은 골드, 마지막 점 펄싱.
 * 라벨/그리드 없음 (오버레이 노이즈 최소화).
 */
function CardOverlayChart({ points, width, height }: { points: number[]; width: number; height: number }) {
  const W = 320;
  const H = 70;
  const PAD = 4;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const usableW = W - PAD * 2;
  const usableH = H - PAD * 2;
  const stepX = usableW / (points.length - 1);
  const xOf = (i: number) => PAD + i * stepX;
  const yOf = (v: number) => PAD + (usableH - ((v - min) / range) * usableH);
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const area =
    `${line} L${xOf(points.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} ` +
    `L${xOf(0).toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  const up = points[points.length - 1] >= points[0];
  const lastIdx = points.length - 1;
  const lastX = xOf(lastIdx);
  const lastY = yOf(points[lastIdx]);

  const pulseR = pulse.interpolate({ inputRange: [0, 1], outputRange: [3.5, 11] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

  return (
    <View style={{ width, height, alignSelf: 'center' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id={`cv-chart-grad-${up ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={up ? 'rgba(255,210,63,0.7)' : 'rgba(126,182,255,0.7)'} />
            <Stop offset="100%" stopColor={up ? 'rgba(255,210,63,0)' : 'rgba(126,182,255,0)'} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill={`url(#cv-chart-grad-${up ? 'up' : 'down'})`} />
        <Path
          d={line}
          stroke="#FFD23F"
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={lastX} cy={lastY} r={3.5} fill="#FFD23F" />
        <AnimatedCircle
          cx={lastX}
          cy={lastY}
          r={pulseR}
          stroke="#FFD23F"
          strokeOpacity={pulseOpacity}
          fill="none"
        />
      </Svg>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* ----------------------- styles ------------------------- */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#22F58C',
    borderRadius: 18,
    overflow: 'hidden',
    // 그린 네온 글로우 — shadowOpacity/Radius/elevation 은 펄싱 보간으로 덮음.
    shadowColor: '#22F58C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 22,
  },
  fallback: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  topContent: {
    position: 'absolute',
    top: 18,
    left: 16,
    right: 60, // X 버튼 영역 비워둠
  },
  botOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  botContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  priceRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'nowrap',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
});
