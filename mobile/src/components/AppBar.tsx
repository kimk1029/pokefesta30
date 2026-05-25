import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors } from '@/theme/tokens';
import { PixelText } from './PixelText';
import { PixelPress } from './cv/PixelPress';
import { useThemeColors, useThemeTextVariant } from './ThemeProvider';

interface Props extends ViewProps {
  title?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
  /** When set, shows a left ◀ back button instead of the logo. */
  onBack?: () => void;
}

const SLOT = 38; // square hit-area for left/right buttons — keeps title centered

export function AppBar({ title, right, left, onBack, style, ...rest }: Props) {
  const c = useThemeColors();
  const textVariant = useThemeTextVariant();
  const leftSlot = onBack ? <ABtn onPress={onBack}>◀</ABtn> : left;
  const rightSlot = right;
  return (
    <View style={[styles.bar, { backgroundColor: c.paper, borderBottomColor: c.ink }, style]} {...rest}>
      <View style={styles.slot}>{leftSlot}</View>
      <View style={styles.center}>
        {title ? (
          <PixelText variant={textVariant} size={13} weight="bold" color={c.ink} style={styles.title} numberOfLines={1}>
            {title}
          </PixelText>
        ) : (
          <View style={styles.logoWrap}>
            <PixelText variant={textVariant} size={13} color={c.ink} style={{ letterSpacing: 1 }}>
              🃏 CardVault
            </PixelText>
          </View>
        )}
      </View>
      <View style={styles.slot}>{rightSlot}</View>
      <View pointerEvents="none" style={[styles.bevel, { backgroundColor: c.pap3 }]} />
    </View>
  );
}

interface ABtnProps {
  onPress?: () => void;
  children: React.ReactNode;
}

export function ABtn({ onPress, children }: ABtnProps) {
  const c = useThemeColors();
  // 다른 픽셀 박스와 동일한 노치 코너 + 단일 하드 드롭섀도 (꼭지점 빔).
  return (
    <PixelPress
      onPress={onPress}
      bg={c.white}
      border={c.ink}
      borderWidth={3}
      shadow={4}
      inner={3}
      hi="rgba(255,255,255,0.9)"
      lo={null}
    >
      <View style={abtnStyles.body}>
        <PixelText variant="pixel" size={14} color={c.ink}>
          {children as string}
        </PixelText>
      </View>
    </PixelPress>
  );
}

const abtnStyles = StyleSheet.create({
  // 28 + 좌우 투명 보더(3*2) = 34 ≈ 기존 SLOT-4 크기.
  body: {
    width: SLOT - 10,
    height: SLOT - 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderBottomWidth: 4,
    borderBottomColor: colors.ink,
    position: 'relative',
  },
  slot: {
    width: SLOT,
    height: SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    textAlign: 'center',
    letterSpacing: 1,
  },
  bevel: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.pap3,
  },
});
