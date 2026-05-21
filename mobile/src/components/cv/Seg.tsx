import { View, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { PixelText } from '../PixelText';

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (id: T) => void;
  tabs: Tab<T>[];
  size?: number;
}

/**
 * Dark segmented control — ink frame, gold-active tabs.
 */
export function Seg<T extends string>({ value, onChange, tabs, size = 10 }: Props<T>) {
  const shadow = 4;
  return (
    <View style={[styles.wrap, { marginRight: shadow, marginBottom: shadow }]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: colors.ink,
            top: shadow,
            left: shadow,
            right: -shadow,
            bottom: -shadow,
          },
        ]}
      />
      <View style={styles.body}>
        {tabs.map((t, i) => {
          const on = value === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => onChange(t.id)}
              style={[
                styles.seg,
                { backgroundColor: on ? colors.gold : colors.ink2 },
                i < tabs.length - 1 && { marginRight: 3 },
              ]}
            >
              <PixelText
                variant="pixel"
                size={size}
                color={on ? colors.ink : colors.pap3}
                style={{ letterSpacing: 0.5 }}
              >
                {t.label}
              </PixelText>
              {on ? (
                <>
                  <View pointerEvents="none" style={[styles.bevel, { top: 0, backgroundColor: colors.goldLt }]} />
                  <View pointerEvents="none" style={[styles.bevel, { bottom: 0, backgroundColor: colors.goldDk }]} />
                </>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  body: {
    backgroundColor: colors.ink,
    padding: 3,
    flexDirection: 'row',
    borderColor: colors.ink,
    borderWidth: 3,
  },
  seg: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bevel: { position: 'absolute', left: 0, right: 0, height: 2 },
});
