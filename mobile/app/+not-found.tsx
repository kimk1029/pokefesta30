import { View } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { colors } from '@/theme/tokens';

export default function NotFound() {
  return (
    <View style={{ flex: 1 }}>
      <AppBar title="없는 화면" />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <PixelText variant="pixel" size={14} color={colors.ink}>
          404
        </PixelText>
        <PixelText
          variant="pixel"
          size={10}
          color={colors.ink3}
          style={{ marginTop: 12 }}
        >
          존재하지 않는 페이지입니다
        </PixelText>
      </View>
    </View>
  );
}
