/**
 * /auth — OAuth 콜백 처리 라우트.
 *
 * 서버는 모바일 OAuth 성공 시 `pokefesta30://auth?token=<jwt>` 로 redirect.
 * 일반적으로 AuthWebView 안에서 onShouldStartLoadWithRequest 가 가로채지만,
 * 외부 브라우저로 빠졌거나 cold-start 일 때는 OS 가 deep link 를 OS 핸들러로
 * 라우팅 → expo-router 가 `/auth?token=…` 으로 진입. 이 화면이 폴백.
 *
 * 동작:
 *   1. searchParams 의 token 을 setSession 으로 저장
 *   2. 짧게 로딩 표시 후 router.replace('/') 로 홈 이동
 *   3. token 이 없으면 /login 으로 보냄
 */
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { setSession } from '@/lib/session';
import { getApiBaseUrl } from '@/lib/apiClient';
import { colors } from '@/theme/tokens';
import { PixelText } from '@/components/PixelText';

export default function AuthCallback() {
  const params = useLocalSearchParams<{ token?: string }>();

  useEffect(() => {
    const token = typeof params.token === 'string' ? params.token : '';
    if (!token) {
      router.replace('/login' as never);
      return;
    }
    try {
      setSession({ token, expiresAt: null, baseUrl: getApiBaseUrl() });
    } catch (e) {
      console.warn('[auth] setSession failed', e);
    }
    // 약간의 딜레이로 사용자가 처리 중인 걸 인지하도록.
    const t = setTimeout(() => router.replace('/' as never), 250);
    return () => clearTimeout(t);
  }, [params.token]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
      }}
    >
      <ActivityIndicator color={colors.ink} />
      <PixelText variant="pixel" size={10} color={colors.ink3}>
        로그인 처리 중…
      </PixelText>
    </View>
  );
}
