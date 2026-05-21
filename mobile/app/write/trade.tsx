import { View, ScrollView, StyleSheet, TextInput } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelButton } from '@/components/PixelButton';
import { colors, space } from '@/theme/tokens';

export default function WriteTrade() {
  return (
    <View style={{ flex: 1 }}>
      <AppBar title="거래 쓰기" />
      <ScrollView contentContainerStyle={{ padding: space.gap, gap: space.cg }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PixelButton bg={colors.red} padding={10} style={{ flex: 1 }}>
            <PixelText
              variant="pixel"
              size={10}
              color={colors.white}
              style={{ textAlign: 'center' }}
            >
              팔아요
            </PixelText>
          </PixelButton>
          <PixelButton bg={colors.white} padding={10} style={{ flex: 1 }}>
            <PixelText
              variant="pixel"
              size={10}
              color={colors.ink}
              style={{ textAlign: 'center' }}
            >
              구해요
            </PixelText>
          </PixelButton>
        </View>

        <PixelText variant="pixel" size={10} color={colors.ink}>
          제목
        </PixelText>
        <TextInput
          placeholder="예) 잉어킹 프로모 코드 1장 판매"
          placeholderTextColor={colors.ink3}
          style={styles.input}
        />

        <PixelText variant="pixel" size={10} color={colors.ink}>
          가격
        </PixelText>
        <TextInput
          placeholder="예) 1.5만 / 제안"
          placeholderTextColor={colors.ink3}
          style={styles.input}
        />

        <PixelText variant="pixel" size={10} color={colors.ink}>
          설명
        </PixelText>
        <TextInput
          multiline
          placeholder="거래 조건과 만남 장소를 적어주세요"
          placeholderTextColor={colors.ink3}
          style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
        />

        <PixelButton bg={colors.blu} padding={14}>
          <PixelText
            variant="pixel"
            size={11}
            color={colors.white}
            style={{ textAlign: 'center' }}
          >
            거래글 등록
          </PixelText>
        </PixelButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    padding: 12,
    borderWidth: 3,
    borderColor: colors.ink,
    fontSize: 14,
    fontFamily: 'Galmuri11',
    color: colors.ink,
  },
});
