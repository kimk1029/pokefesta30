import { View, ScrollView, StyleSheet, TextInput } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelButton } from '@/components/PixelButton';
import { colors, space } from '@/theme/tokens';

export default function WriteFeed() {
  return (
    <View style={{ flex: 1 }}>
      <AppBar title="커뮤니티 글 쓰기" />
      <ScrollView contentContainerStyle={{ padding: space.gap, gap: space.cg }}>
        <PixelText variant="pixel" size={10} color={colors.ink}>
          하고 싶은 말
        </PixelText>
        <TextInput
          multiline
          placeholder="자랑 / 잡담 / 감정 요청 등 자유롭게"
          placeholderTextColor={colors.ink3}
          style={styles.textarea}
        />

        <PixelButton bg={colors.yel} padding={14}>
          <PixelText
            variant="pixel"
            size={11}
            color={colors.ink}
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
