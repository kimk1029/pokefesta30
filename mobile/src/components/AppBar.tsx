import { View, StyleSheet, Pressable, type ViewProps } from 'react-native';
import { colors } from '@/theme/tokens';
import { PixelText } from './PixelText';
import { useThemeColors } from './ThemeProvider';

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
  const leftSlot = onBack ? <ABtn onPress={onBack}>◀</ABtn> : left;
  const rightSlot = right;
  return (
    <View style={[styles.bar, { backgroundColor: c.paper, borderBottomColor: c.ink }, style]} {...rest}>
      <View style={styles.slot}>{leftSlot}</View>
      <View style={styles.center}>
        {title ? (
          <PixelText variant="pixel" size={13} weight="bold" color={c.ink} style={styles.title} numberOfLines={1}>
            {title}
          </PixelText>
        ) : (
          <View style={styles.logoWrap}>
            <PixelText variant="pixel" size={13} color={c.ink} style={{ letterSpacing: 1 }}>
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
  const shadow = 4;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      abtnStyles.wrap,
      { marginRight: shadow, marginBottom: shadow, transform: [{ translateX: pressed ? shadow : 0 }, { translateY: pressed ? shadow : 0 }] },
    ]}>
      {({ pressed }) => (
        <>
          {!pressed ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: c.ink,
                  top: shadow,
                  left: shadow,
                  right: -shadow,
                  bottom: -shadow,
                },
              ]}
            />
          ) : null}
          <View style={[abtnStyles.body, { backgroundColor: c.white, borderColor: c.ink }]}>
            <PixelText variant="pixel" size={14} color={c.ink}>
              {children as string}
            </PixelText>
            {!pressed ? <View pointerEvents="none" style={abtnStyles.hi} /> : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

const abtnStyles = StyleSheet.create({
  wrap: { position: 'relative' },
  body: {
    width: SLOT - 4,
    height: SLOT - 4,
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hi: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
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
