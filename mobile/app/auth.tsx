/**
 * /auth — OAuth 콜백 처리 라우트.
 *
 * +native-intent 가 pokefesta30://auth?token=… 를 이 경로로 정규화해 보낸다.
 * 토큰은 두 경로로 시도: useLocalSearchParams(token) → 실패 시 useURL() 의 raw
 * URL 에서 직접 파싱 (RN/Hermes 는 URLSearchParams 미지원 → 문자열 슬라이싱).
 * 저장 후 홈으로 replace.
 */
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { setSession } from '@/lib/session';
import { getApiBaseUrl } from '@/lib/apiClient';
import { colors } from '@/theme/tokens';
import { PixelText } from '@/components/PixelText';

function tokenFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
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

export default function AuthCallback() {
  const params = useLocalSearchParams<{ token?: string }>();
  const url = useURL();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const token =
      (typeof params.token === 'string' && params.token.length > 0 ? params.token : null) ??
      tokenFromUrl(url);
    if (!token) return; // 아직 안 들어옴 — 다음 렌더에서 다시 시도
    done.current = true;
    try {
      setSession({
        token,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        baseUrl: getApiBaseUrl(),
      });
    } catch (e) {
      console.warn('[auth] setSession failed', e);
    }
    setTimeout(() => router.replace('/' as never), 150);
  }, [params.token, url]);

  // 안전망: 토큰이 끝내 안 들어오면 3초 뒤 홈으로.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!done.current) router.replace('/' as never);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

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
