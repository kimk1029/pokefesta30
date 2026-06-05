/**
 * 로그인 화면.
 *
 * 소셜 로그인 버튼을 누르면 웹 OAuth 시작 URL을 시스템 브라우저로 연다.
 * OAuth 콜백이 끝나면 서버가 `pokefesta30://auth?token=<jwt>` 로 리다이렉트하고,
 * 루트 레이아웃의 딥링크 핸들러가 토큰을 저장한다.
 */
import { useState } from 'react';
import { View, ScrollView, Pressable, Text, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { PixelText } from '@/components/PixelText';
import { PixelPress } from '@/components/cv/PixelPress';
import { PixelBall } from '@/components/PixelBall';
import { colors } from '@/theme/tokens';
import { useThemeColors, useThemeTextVariant } from '@/components/ThemeProvider';
import { getApiBaseUrl } from '@/lib/apiClient';
import { isAuthenticated } from '@/lib/session';
import { startSocialLogin, type AuthProvider } from '@/lib/oauth';

export default function LoginScreen() {
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
  const [busy, setBusy] = useState(false);

  const startLogin = async (provider: AuthProvider) => {
    if (busy) return;
    setBusy(true);
    try {
      await startSocialLogin(provider);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40, paddingTop: 80 }}>
        {/* Hero — 픽셀 포켓볼 + 타이틀 */}
        <View style={{ alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <View
            style={{
              padding: 14,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderColor: tc.gold,
              borderWidth: 3,
            }}
          >
            <PixelBall size={72} />
          </View>
          <PixelText variant={txt} size={17} color={tc.gold} style={{ letterSpacing: 2 }} numberOfLines={1}>
            CardVault
          </PixelText>
          <PixelText
            variant="ko"
            size={12}
            color="rgba(255,255,255,0.65)"
            style={{ textAlign: 'center', lineHeight: 20 }}
          >
            포켓몬 카드를 스마트하게{'\n'}스캔 · 아카이빙 · 거래 · 그레이딩
          </PixelText>
        </View>

        {isAuthenticated() ? (
          <View
            style={{
              marginBottom: 24,
              padding: 14,
              backgroundColor: tc.grnDk,
              borderColor: tc.ink,
              borderWidth: 3,
            }}
          >
            <PixelText variant={txt} size={10} color={tc.white} style={{ textAlign: 'center' }}>
              ✓ 이미 로그인되어 있어요
            </PixelText>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginVertical: 18,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <PixelText variant={txt} size={8} color="rgba(255,255,255,0.4)" style={{ letterSpacing: 1 }}>
            소셜 로그인
          </PixelText>
          <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </View>

        <View style={{ gap: 12 }}>
          <LoginBtn
            bg="#FEE500"
            fg="#3A1D00"
            icon="💬"
            name="카카오로 시작하기"
            desc="카카오 계정으로 간편 로그인"
            onPress={() => startLogin('kakao')}
          />
          <LoginBtn
            bg="#03C75A"
            fg={tc.white}
            icon="N"
            name="네이버로 시작하기"
            desc="네이버 계정으로 간편 로그인"
            onPress={() => startLogin('naver')}
          />
          <LoginBtn
            bg={tc.white}
            fg={tc.ink}
            icon="G"
            name="구글로 시작하기"
            desc="Google 계정으로 간편 로그인"
            onPress={() => startLogin('google')}
          />
        </View>

        <Pressable
          style={{ marginTop: 28, padding: 10, alignItems: 'center' }}
          onPress={() => router.replace('/' as never)}
        >
          <PixelText variant={txt} size={9} color="rgba(255,255,255,0.35)" style={{ letterSpacing: 1 }}>
            로그인 없이 둘러보기 →
          </PixelText>
        </Pressable>

        <PixelText
          variant="ko"
          size={9}
          color="rgba(255,255,255,0.35)"
          style={{ marginTop: 24, textAlign: 'center', lineHeight: 16, paddingHorizontal: 14 }}
        >
          로그인 시{' '}
          <PixelText variant="ko" size={9} color={tc.gold}>이용약관</PixelText>
          {' · '}
          <PixelText variant="ko" size={9} color={tc.gold}>개인정보처리방침</PixelText>
          에{'\n'}동의한 것으로 간주됩니다.
        </PixelText>

        <PixelText
          variant={txt}
          size={7}
          color="rgba(255,255,255,0.18)"
          style={{ marginTop: 24, textAlign: 'center', lineHeight: 12 }}
        >
          API: {getApiBaseUrl()}
        </PixelText>
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
  const tc = useThemeColors();
  const txt = useThemeTextVariant();
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
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            backgroundColor: 'rgba(0,0,0,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: 'rgba(0,0,0,0.15)',
            borderWidth: 1,
          }}
        >
          <Text style={{ fontSize: 22, color: fg, fontWeight: 'bold' }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <PixelText variant={txt} size={11} color={fg} style={{ letterSpacing: 1 }}>
            {name}
          </PixelText>
          <PixelText
            variant={txt}
            size={9}
            color={fg}
            style={{ marginTop: 5, opacity: 0.65, letterSpacing: 0.3 }}
          >
            {desc}
          </PixelText>
        </View>
      </View>
    </PixelPress>
  );
}
