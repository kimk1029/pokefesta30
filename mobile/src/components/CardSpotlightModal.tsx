import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { PixelText } from './PixelText';
import { colors } from '@/theme/tokens';

/**
 * 카드 스포트라이트 — 컬렉션에서 🔍 버튼을 누르면 그 카드 썸네일이 풀스크린으로
 * 날아와서 회전(rotateY 360°)하며 펼쳐지는 모달.
 *
 * 웹 [[src/components/CardSpotlightModal.tsx]] 와 시각/UX 가 1:1 매칭되도록 만들었다.
 * RN 에는 CSS transition 이 없어 Animated.Value × 5 (tx, ty, sx, sy, rotateY) 로
 * FLIP 보간을 직접 구동한다. transform-only 라 useNativeDriver=true 가능 → 60fps.
 *
 * 본문(가격/등락/차트) 은 카드가 70% 펼쳐졌을 때(=delay 350ms) fade-in 으로 등장.
 */

export interface CardSpotlightData {
  imageUrl: string | null;
  emojiFallback?: string;
  name: string;
  subtitle?: string | null;
  gradeLabel?: string | null;
  /** "¥38,000" 같이 통화 기호까지 포함된 문자열. null 이면 "시세 없음". */
  priceLabel: string | null;
  /** 가격 추이 — 오래된 → 최신. 2개 미만이면 차트/등락 숨김. */
  trend: number[];
  /** 차트 min/max 라벨용 통화 기호 (¥/₩/$). */
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
  /** 시작 사각형 (썸네일의 measureInWindow). null 이면 페이드 인. */
  origin: SpotlightOrigin | null;
  onClose: () => void;
}

const OPEN_MS = 650;
const CLOSE_MS = 380;
const BODY_DELAY_MS = 350;

export function CardSpotlightModal({ data, origin, onClose }: Props) {
  const screen = Dimensions.get('window');

  // 카드 풀스크린 너비 = min(78% screen, 360px). 웹과 같은 비율.
  const cardW = Math.min(screen.width * 0.78, 360);
  const cardH = cardW * (88 / 63);

  // FLIP 보간용 Animated Values.
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotY = useRef(new Animated.Value(0)).current; // 0 → 1 = 0deg → 360deg
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyTranslate = useRef(new Animated.Value(20)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // 카드의 풀스크린 최종 좌상단 좌표 — onLayout 으로 측정. 측정되면 origin 으로 reset.
  const [cardLayout, setCardLayout] = useState<{ x: number; y: number } | null>(null);
  const [closing, setClosing] = useState(false);

  // origin 을 closing 때도 쓰려고 보관.
  const closeOriginRef = useRef<SpotlightOrigin | null>(origin);
  useEffect(() => {
    closeOriginRef.current = origin;
  }, [origin]);

  /* 모달이 열리면 → reset(origin 위치) → tween(final) */
  useEffect(() => {
    if (!data || !cardLayout) return;
    const o = closeOriginRef.current;

    // 배경 페이드
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    if (o) {
      // FLIP — 카드의 final layout 기준 origin 으로 reset.
      const finalCx = cardLayout.x + cardW / 2;
      const finalCy = cardLayout.y + cardH / 2;
      const originCx = o.x + o.width / 2;
      const originCy = o.y + o.height / 2;
      const sx = o.width / cardW;
      tx.setValue(originCx - finalCx);
      ty.setValue(originCy - finalCy);
      scale.setValue(Math.max(0.05, sx));
      rotY.setValue(0);
      cardOpacity.setValue(1);
    } else {
      tx.setValue(0);
      ty.setValue(0);
      scale.setValue(0.85);
      rotY.setValue(0.5); // 180deg
      cardOpacity.setValue(0);
    }

    // 본문은 처음엔 숨김.
    bodyOpacity.setValue(0);
    bodyTranslate.setValue(20);

    // 카드 펼치기.
    Animated.parallel([
      Animated.timing(tx, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.bezier(0.22, 0.85, 0.25, 1.02),
        useNativeDriver: true,
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.bezier(0.22, 0.85, 0.25, 1.02),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.bezier(0.22, 0.85, 0.25, 1.02),
        useNativeDriver: true,
      }),
      Animated.timing(rotY, {
        toValue: 1, // 360deg
        duration: OPEN_MS,
        easing: Easing.bezier(0.22, 0.85, 0.25, 1.02),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // 본문 등장 (delay 후 fade up).
    Animated.sequence([
      Animated.delay(BODY_DELAY_MS),
      Animated.parallel([
        Animated.timing(bodyOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.bezier(0.2, 0.9, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(bodyTranslate, {
          toValue: 0,
          duration: 420,
          easing: Easing.bezier(0.2, 0.9, 0.3, 1),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, cardLayout]);

  /* 안드로이드 뒤로가기 = 닫기 */
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
    if (closing || !cardLayout) {
      onClose();
      return;
    }
    setClosing(true);
    const o = closeOriginRef.current;
    const animations: Animated.CompositeAnimation[] = [];

    animations.push(
      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bodyOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    );

    if (o) {
      const finalCx = cardLayout.x + cardW / 2;
      const finalCy = cardLayout.y + cardH / 2;
      const originCx = o.x + o.width / 2;
      const originCy = o.y + o.height / 2;
      const sx = o.width / cardW;
      animations.push(
        Animated.timing(tx, {
          toValue: originCx - finalCx,
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: originCy - finalCy,
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: Math.max(0.05, sx),
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rotY, {
          toValue: 0, // 360deg → 0deg = -360 = 1바퀴 역회전
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      );
    } else {
      animations.push(
        Animated.timing(scale, {
          toValue: 0.85,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rotY, {
          toValue: 0.5,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      );
    }

    Animated.parallel(animations).start(() => {
      setClosing(false);
      setCardLayout(null);
      onClose();
    });
  }, [closing, cardLayout, cardW, cardH, onClose, bgOpacity, bodyOpacity, tx, ty, scale, rotY, cardOpacity]);

  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y } = e.nativeEvent.layout;
    setCardLayout({ x, y });
  }, []);

  const change = useMemo(() => (data ? changeFromTrend(data.trend) : null), [data]);

  if (!data) return null;

  const rotateInterpolate = rotY.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={!!data}
      transparent
      animationType="none"
      onRequestClose={startClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[styles.backdrop, { opacity: bgOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={startClose} />

        {/* 닫기 ✕ — 우상단 */}
        <Pressable
          accessibilityLabel="닫기"
          onPress={startClose}
          style={styles.closeBtn}
        >
          <PixelText variant="pixel" size={14} color={colors.gold} weight="bold">
            ✕
          </PixelText>
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* 카드 본체 — FLIP 애니메이션 대상 */}
          <Animated.View
            onLayout={onCardLayout}
            style={[
              styles.card,
              {
                width: cardW,
                height: cardH,
                opacity: cardOpacity,
                transform: [
                  { translateX: tx },
                  { translateY: ty },
                  { perspective: 1200 },
                  { rotateY: rotateInterpolate },
                  { scale },
                ],
              },
            ]}
          >
            {data.imageUrl ? (
              <Image
                source={{ uri: data.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardFallback}>
                <PixelText variant="pixel" size={110} color={colors.gold}>
                  {data.emojiFallback ?? '🃏'}
                </PixelText>
              </View>
            )}
          </Animated.View>

          {/* 본문 — 카드가 펼쳐진 다음에 fade up */}
          <Animated.View
            style={[
              styles.bodyWrap,
              {
                opacity: bodyOpacity,
                transform: [{ translateY: bodyTranslate }],
              },
            ]}
            // 본문 영역은 백드롭 탭으로 닫히지 않게
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.bodyCard}>
              <PixelText variant="ko" size={18} weight="bold" color={colors.ink}>
                {data.name}
              </PixelText>
              {(data.subtitle || data.gradeLabel) && (
                <PixelText variant="pixel" size={10} color={colors.ink3} style={{ marginTop: 4 }}>
                  {[data.subtitle, data.gradeLabel].filter(Boolean).join(' · ')}
                </PixelText>
              )}

              {/* 현재 시세 + 전일 대비 — 어두운 박스 */}
              <View style={styles.priceBox}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PixelText variant="pixel" size={9} color="rgba(255,210,63,0.7)">
                    현재 시세
                  </PixelText>
                  <PixelText variant="pixel" size={22} weight="bold" color={colors.gold} style={{ marginTop: 2 }}>
                    {data.priceLabel ?? '시세 없음'}
                  </PixelText>
                </View>
                {change && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <PixelText variant="pixel" size={9} color="rgba(255,210,63,0.7)">
                      전일 대비
                    </PixelText>
                    <PixelText
                      variant="pixel"
                      size={16}
                      weight="bold"
                      color={CHANGE_TONE[change.dir]}
                      style={{ marginTop: 2 }}
                    >
                      {CHANGE_ARROW[change.dir]} {Math.abs(change.pct).toFixed(1)}%
                    </PixelText>
                  </View>
                )}
              </View>

              {/* 큰 추이 차트 */}
              {data.trend.length >= 2 ? (
                <View style={styles.chartBox}>
                  <View style={styles.chartHeader}>
                    <PixelText variant="pixel" size={9} color={colors.ink3}>
                      📈 최근 추이 (총 {data.trend.length}점)
                    </PixelText>
                    <PixelText variant="pixel" size={9} color={colors.ink3}>
                      {data.currencySymbol ?? ''}
                      {fmtNum(Math.min(...data.trend))} ~ {data.currencySymbol ?? ''}
                      {fmtNum(Math.max(...data.trend))}
                    </PixelText>
                  </View>
                  <BigSparkline points={data.trend} />
                </View>
              ) : (
                <View style={styles.chartEmpty}>
                  <PixelText variant="pixel" size={10} color={colors.ink3}>
                    📊 추이 데이터가 아직 부족해요
                  </PixelText>
                </View>
              )}
            </View>

            <PixelText
              variant="pixel"
              size={9}
              color="rgba(255,255,255,0.5)"
              style={{ marginTop: 16, textAlign: 'center' }}
            >
              탭/뒤로가기로 닫기
            </PixelText>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/* ----------------------- helpers ------------------------- */

const CHANGE_ARROW: Record<'up' | 'down' | 'flat', string> = { up: '▲', down: '▼', flat: '–' };
const CHANGE_TONE: Record<'up' | 'down' | 'flat', string> = {
  up: '#FF6B7E',
  down: '#7EB6FF',
  flat: 'rgba(255,255,255,0.65)',
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

function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return '0';
  return Math.round(v).toLocaleString('ko-KR');
}

/**
 * 풀스크린 모달용 큰 라인 차트 — 상승은 빨강, 하락은 파랑 (한국 관습).
 * area fill + 마지막 점 펄싱 강조.
 */
function BigSparkline({ points }: { points: number[] }) {
  const W = 320;
  const H = 110;
  const PAD = 8;
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
  const line = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`)
    .join(' ');
  const area =
    `${line} L${xOf(points.length - 1).toFixed(1)},${(H - PAD).toFixed(1)} ` +
    `L${xOf(0).toFixed(1)},${(H - PAD).toFixed(1)} Z`;
  const up = points[points.length - 1] >= points[0];
  const stroke = up ? '#E63946' : '#3A5BD9';
  const fill = up ? 'rgba(230,57,70,0.18)' : 'rgba(58,91,217,0.18)';

  const lastIdx = points.length - 1;
  const lastX = xOf(lastIdx);
  const lastY = yOf(points[lastIdx]);

  const pulseR = pulse.interpolate({ inputRange: [0, 1], outputRange: [4.5, 11] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={{ width: '100%', aspectRatio: W / H }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        {/* grid */}
        {[0.25, 0.5, 0.75].map((t) => (
          <Line
            key={t}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + usableH * t}
            y2={PAD + usableH * t}
            stroke="rgba(0,0,0,0.08)"
            strokeDasharray="3,3"
          />
        ))}
        <Path d={area} fill={fill} />
        <Path
          d={line}
          stroke={stroke}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={lastX} cy={lastY} r={4.5} fill={stroke} />
        <AnimatedCircle
          cx={lastX}
          cy={lastY}
          r={pulseR}
          stroke={stroke}
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
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  card: {
    backgroundColor: '#000',
    borderWidth: 4,
    borderColor: colors.gold,
    overflow: 'hidden',
    // 골드 후광 — RN 그림자(엘리베이션) 흉내. iOS 는 shadow*, Android 는 elevation.
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 24,
  },
  cardFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyWrap: {
    width: '100%',
    maxWidth: 480,
    marginTop: 22,
  },
  bodyCard: {
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.ink,
    // 골드 드롭섀도 흉내 — 5px 오프셋.
    shadowColor: colors.gold,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  priceBox: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  chartBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.pap2,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chartEmpty: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.pap2,
    alignItems: 'center',
  },
});

