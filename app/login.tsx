import { View, ScrollView, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { PixelText } from '@/components/PixelText';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';

export default function LoginScreen() {
  const onLogin = () => router.replace('/' as never);
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink2 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {/* logo */}
        <View style={{ marginTop: 60, alignItems: 'center', gap: 16, marginBottom: 36 }}>
          <Text style={{ fontSize: 52, lineHeight: 60 }}>🃏</Text>
          <PixelText
            variant="pixel"
            size={20}
            color={colors.gold}
            style={{ letterSpacing: 3 }}
          >
            CardVault
          </PixelText>
          <PixelText
            variant="pixel"
            size={10}
            color="rgba(255,255,255,0.55)"
            style={{ letterSpacing: 1, textAlign: 'center', lineHeight: 22 }}
          >
            내 카드를 가장 스마트하게{`\n`}스캔 · 아카이빙 · 거래 · 그레이딩
          </PixelText>
        </View>

        <PixelText
          variant="pixel"
          size={9}
          color="rgba(255,255,255,0.3)"
          style={{ letterSpacing: 1, marginVertical: 16, textAlign: 'center' }}
        >
          ── 소셜 로그인 ──
        </PixelText>

        <View style={{ gap: 12 }}>
          <LoginBtn
            bg="#FEE500"
            fg="#3A1D00"
            icon="💬"
            name="카카오로 시작하기"
            desc="카카오 계정으로 간편 로그인"
            onPress={onLogin}
          />
          <LoginBtn
            bg="#03C75A"
            fg={colors.white}
            icon="N"
            name="네이버로 시작하기"
            desc="네이버 계정으로 간편 로그인"
            onPress={onLogin}
          />
          <LoginBtn
            bg={colors.white}
            fg={colors.ink}
            icon="G"
            name="구글로 시작하기"
            desc="Google 계정으로 간편 로그인"
            onPress={onLogin}
          />
        </View>

        <Pressable style={{ marginTop: 20, padding: 8, alignItems: 'center' }} onPress={onLogin}>
          <PixelText
            variant="pixel"
            size={9}
            color="rgba(255,255,255,0.3)"
            style={{ letterSpacing: 1 }}
          >
            로그인 없이 둘러보기 →
          </PixelText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

interface BtnProps {
  bg: string;
  fg: string;
  icon: string;
  name: string;
  desc: string;
  onPress: () => void;
}

function LoginBtn({ bg, fg, icon, name, desc, onPress }: BtnProps) {
  return (
    <PixelPress
      onPress={onPress}
      bg={bg}
      borderWidth={4}
      shadow={7}
      hi="rgba(255,255,255,0.4)"
      lo="rgba(0,0,0,0.18)"
      inner={3}
    >
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            backgroundColor: 'rgba(0,0,0,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 22, color: fg }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <PixelText variant="pixel" size={11} color={fg} style={{ letterSpacing: 1 }}>
            {name}
          </PixelText>
          <PixelText
            variant="pixel"
            size={9}
            color={fg}
            style={{ marginTop: 4, opacity: 0.65, letterSpacing: 0.3 }}
          >
            {desc}
          </PixelText>
        </View>
      </View>
    </PixelPress>
  );
}
