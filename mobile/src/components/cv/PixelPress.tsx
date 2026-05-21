import {
  Pressable,
  View,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/theme/tokens';

interface Props extends PressableProps {
  bg?: string;
  border?: string;
  borderWidth?: number;
  shadow?: number;
  hi?: string | null;
  lo?: string | null;
  inner?: number;
  innerStyle?: StyleProp<ViewStyle>;
  /** Pressable wrap style (margins, alignSelf, etc) */
  wrapStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Pressable 3D pixel button — top/left highlight + bottom/right shadow + offset hard shadow.
 * On press: face translates into the shadow space, giving a satisfying "click" depression.
 */
export function PixelPress({
  bg = colors.white,
  border = colors.ink,
  borderWidth = 4,
  shadow = 8,
  hi = 'rgba(255,255,255,0.95)',
  lo = 'rgba(0,0,0,0.32)',
  inner = 5,
  innerStyle,
  wrapStyle,
  children,
  style,
  ...rest
}: Props) {
  return (
    <Pressable {...rest}>
      {(state) => {
        const pressed = state.pressed;
        const off = pressed ? 1 : shadow;
        const dropOff = pressed ? 1 : Math.max(2, shadow - 2);
        const styleVal = typeof style === 'function' ? style(state) : style;
        return (
          <View style={[styles.wrap, { marginRight: off, marginBottom: off }, wrapStyle, styleVal]}>
            {/* deepest ground shadow */}
            {shadow > 0 ? (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: border,
                    top: off,
                    left: off,
                    right: -off,
                    bottom: -off,
                  },
                ]}
              />
            ) : null}
            {/* mid-step shadow plane */}
            {shadow > 2 && !pressed ? (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: 'rgba(15,23,42,0.55)',
                    top: dropOff,
                    left: dropOff,
                    right: -dropOff,
                    bottom: -dropOff,
                  },
                ]}
              />
            ) : null}
            <View
              style={[
                {
                  backgroundColor: bg,
                  borderColor: border,
                  borderWidth,
                  transform: [
                    { translateX: pressed ? shadow - off : 0 },
                    { translateY: pressed ? shadow - off : 0 },
                  ],
                },
                innerStyle,
              ]}
            >
              {/* top + left highlight (raised edge) */}
              {hi && !pressed ? (
                <>
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: inner,
                      backgroundColor: hi,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: Math.max(2, inner - 1),
                      backgroundColor: hi,
                    }}
                  />
                </>
              ) : null}
              {/* bottom + right shadow (drop face) */}
              {lo ? (
                <>
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: inner,
                      backgroundColor: lo,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      right: 0,
                      width: Math.max(2, inner - 1),
                      backgroundColor: lo,
                    }}
                  />
                </>
              ) : null}
              {children as React.ReactNode}
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
});
