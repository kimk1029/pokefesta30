import { View } from 'react-native';
import { useThemeColors } from './ThemeProvider';

export function SportsBall({ size = 62 }: { size?: number }) {
  const c = useThemeColors();
  const line = Math.max(4, Math.round(size * 0.1));
  const center = Math.max(12, Math.round(size * 0.34));
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: c.ink,
        backgroundColor: c.white,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: line,
          backgroundColor: c.grn,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: line,
          backgroundColor: c.grn,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          width: center,
          height: center,
          borderRadius: center / 2,
          borderWidth: 3,
          borderColor: c.ink,
          backgroundColor: c.white,
        }}
      />
    </View>
  );
}
