/**
 * 로그인 화면.
 *
 * 소셜 로그인 버튼을 누르면 Express 백엔드의 `/auth/{provider}?platform=mobile`
 * 을 WebView 로 연다. OAuth 콜백이 끝나면 서버가 `pokefesta30://auth?token=<jwt>`
 * 로 리다이렉트. WebView 의 `onShouldStartLoadWithRequest` 가 이 딥링크를 가로채
 * 토큰을 추출 → [[session]] 모듈에 저장.
 */
import { useState } from 'react';
import { View, ScrollView, Pressable, Text, Alert, StatusBar } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { PixelText } from '@/components/PixelText';
import { PixelPress } from '@/components/cv/PixelPress';
import { PixelBall } from '@/components/PixelBall';
import { colors } from '@/theme/tokens';
import { getApiBaseUrl } from '@/lib/apiClient';
import { setSession, isAuthenticated } from '@/lib/session';

type AuthProvider = 'kakao' | 'naver' | 'google';

// OAuth 시작 오리진 — 기본값은 https 웹 (카카오/네이버/구글 콘솔에 등록된 https
// Redirect URI 도메인과 일치해야 provider 가 콜백을 허용). EXPO_PUBLIC_WEB_OAUTH_ORIGIN
// 로 override 가능. (일반 API 호출은 apiClient 가 그대로 Synology 직통.)
const WEB_OAUTH_ORIGIN =
  process.env.EXPO_PUBLIC_WEB_OAUTH_ORIGIN ?? 'https://www.poke-30.com';
const DEEP_LINK = 'pokefesta30://auth';

function tokenFromUrl(url: string): string | null {
  const i = url.indexOf('token=');
  if (i === -1) return null;
  try {
    const raw = url.slice(i + 'token='.length).split('&')[0].split('#')[0];
    const t = decodeURIComponent(raw);
    return t && t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

export default function LoginScreen() {
  const [busy, setBusy] = useState(false);

  /**
   * Expo 권장 OAuth — 시스템 인증 세션을 열고, 서버가 redirect 하는
   * pokefesta30://auth?token=… 를 결과 URL 로 직접 받는다. 딥링크 라우팅이나
   * WebView 인터셉트에 의존하지 않아 404 가 날 수 없다.
   */
  const startLogin = async (provider: AuthProvider) => {
    if (busy) return;
    setBusy(true);
    try {
      const authUrl = `${WEB_OAUTH_ORIGIN}/auth/${provider}?platform=mobile`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, DEEP_LINK);
      if (result.type === 'success' && result.url) {
        const token = tokenFromUrl(result.url);
        if (token) {
          setSession({
            token,
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            baseUrl: getApiBaseUrl(),
          });
          router.replace('/' as never);
          return;
        }
        Alert.alert('로그인 실패', '토큰을 받지 못했어요.');
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // 사용자가 닫음 — 조용히 무시
      } else {
        Alert.alert('로그인 실패', '인증을 완료하지 못했어요.');
      }
    } catch (e) {
      Alert.alert('로그인 오류', e instanceof Error ? e.message : '알 수 없는 오류');
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
              borderColor: colors.gold,
              borderWidth: 3,
            }}
          >
            <PixelBall size={72} />
          </View>
          <PixelText variant="pixel" size={17} color={colors.gold} style={{ letterSpacing: 2 }} numberOfLines={1}>
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
              backgroundColor: colors.grnDk,
              borderColor: colors.ink,
              borderWidth: 3,
            }}
          >
            <PixelText variant="pixel" size={10} color={colors.white} style={{ textAlign: 'center' }}>
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
          <PixelText variant="pixel" size={8} color="rgba(255,255,255,0.4)" style={{ letterSpacing: 1 }}>
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
            fg={colors.white}
            icon="N"
            name="네이버로 시작하기"
            desc="네이버 계정으로 간편 로그인"
            onPress={() => startLogin('naver')}
          />
          <LoginBtn
            bg={colors.white}
            fg={colors.ink}
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
          <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.35)" style={{ letterSpacing: 1 }}>
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
          <PixelText variant="ko" size={9} color={colors.gold}>이용약관</PixelText>
          {' · '}
          <PixelText variant="ko" size={9} color={colors.gold}>개인정보처리방침</PixelText>
          에{'\n'}동의한 것으로 간주됩니다.
        </PixelText>

        <PixelText
          variant="pixel"
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
          <PixelText variant="pixel" size={11} color={fg} style={{ letterSpacing: 1 }}>
            {name}
          </PixelText>
          <PixelText
            variant="pixel"
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
