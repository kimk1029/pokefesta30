import { View, ScrollView, StyleSheet, TextInput } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelButton } from '@/components/PixelButton';
import { colors, space } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';

export default function WriteFeed() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  return (
    <View style={{ flex: 1 }}>
      <AppBar title="커뮤니티 글 쓰기" />
      <ScrollView contentContainerStyle={{ padding: space.gap, gap: space.cg }}>
        <PixelText variant={txt} size={10} color={tc.ink}>
          하고 싶은 말
        </PixelText>
        <TextInput
          multiline
          placeholder="자랑 / 잡담 / 감정 요청 등 자유롭게"
          placeholderTextColor={tc.ink3}
          style={styles.textarea}
        />

        <PixelButton bg={tc.yel} padding={14}>
          <PixelText
            variant={txt}
            size={11}
            color={tc.ink}
            style={{ textAlign: 'center' }}
          >
            글 올리기
          </PixelText>
        </PixelButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  textarea: {
    minHeight: 160,
    backgroundColor: colors.white,
    padding: 12,
    borderWidth: 3,
    borderColor: colors.ink,
    textAlignVertical: 'top',
    fontSize: 14,
    fontFamily: 'Galmuri11',
    color: colors.ink,
  },
});
