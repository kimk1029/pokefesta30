import { View, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { PixelText } from '../PixelText';
import { useThemeColors } from '../ThemeProvider';

interface Props {
  title: string;
  more?: string;
  onMore?: () => void;
}

/**
 * Dark section header — "var(--ink)" body with gold text + bottom-right gold-dk hard shadow.
 */
export function SectHd({ title, more, onMore }: Props) {
  const c = useThemeColors();
  const shadow = 5;
  return (
    <View style={[styles.wrap, { marginRight: shadow, marginBottom: 12 }]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: c.goldDk,
            top: shadow,
            left: shadow,
            right: -shadow,
            bottom: -shadow,
          },
        ]}
      />
      <View style={[styles.body, { backgroundColor: c.ink, borderColor: c.ink }]}>
        <PixelText variant="pixel" size={12} weight="bold" color={c.gold} style={{ flex: 1 }}>
          {title}
        </PixelText>
        {more && onMore ? (
          <Pressable onPress={onMore}>
            <PixelText variant="pixel" size={9} color={c.pap3}>
              {more}
            </PixelText>
          </Pressable>
        ) : null}
      </View>
      {/* inset top + bottom strokes */}
      <View pointerEvents="none" style={[styles.insetTop, { backgroundColor: c.ink2 }]} />
      <View pointerEvents="none" style={styles.insetBot} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  body: {
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderColor: colors.ink,
    borderWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insetTop: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    height: 2,
    backgroundColor: colors.ink2,
  },
  insetBot: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    right: 3,
    height: 2,
    backgroundColor: '#000',
  },
});
