import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';

export default function CardAddScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.push('/my/cards' as never)} title="카드 추가" />

      <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
        <PixelFrame bg={colors.ink} borderWidth={3} shadow={6}>
          <View style={{ padding: 14 }}>
            <PixelText variant="ko" size={14} weight="bold" color={colors.gold}>
              어떻게 추가할까요?
            </PixelText>
            <PixelText variant="ko" size={10} color={colors.white} style={{ marginTop: 7, lineHeight: 16 }}>
              스캔으로 자동 등록하거나 직접 입력해 보관할 수 있어요
            </PixelText>
          </View>
        </PixelFrame>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <AddCard
            emoji="📷"
            title="스캔으로 추가"
            desc="사진 한 장이면 그레이딩까지 자동"
            cta="카메라 열기"
            bg={colors.grn}
            onPress={() => router.push('/cards/grading' as never)}
          />
          <AddCard
            emoji="✍️"
            title="직접 입력"
            desc="카드명·세트·메모를 손으로 채워 넣기"
            cta="입력 폼 열기"
            bg={colors.blu}
            onPress={() => router.push('/scan?mode=manual' as never)}
          />
        </View>

        <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 16, lineHeight: 16 }}>
          스캔 결과가 어색하다면 직접 입력으로 보완할 수 있어요
        </PixelText>
      </View>
    </View>
  );
}

function AddCard({
  emoji,
  title,
  desc,
  cta,
  bg,
  onPress,
}: {
  emoji: string;
  title: string;
  desc: string;
  cta: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <PixelPress onPress={onPress} bg={bg} borderWidth={3} shadow={5}>
        <View style={{ minHeight: 178, padding: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 34 }}>{emoji}</Text>
          <PixelText variant="ko" size={13} weight="bold" color={colors.white} style={{ marginTop: 10, textAlign: 'center' }}>
            {title}
          </PixelText>
          <PixelText variant="ko" size={9} color={colors.white} style={{ marginTop: 8, lineHeight: 15, textAlign: 'center', opacity: 0.9 }}>
            {desc}
          </PixelText>
          <View style={{ marginTop: 'auto', backgroundColor: colors.ink, paddingHorizontal: 8, paddingVertical: 7 }}>
            <PixelText variant="pixel" size={8} color={colors.gold}>
              ▶ {cta}
            </PixelText>
          </View>
        </View>
      </PixelPress>
    </View>
  );
}
