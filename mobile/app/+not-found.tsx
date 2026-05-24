import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { useURL } from 'expo-linking';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { setSession } from '@/lib/session';
import { getApiBaseUrl } from '@/lib/apiClient';
import { colors } from '@/theme/tokens';

/**
 * OAuth 딥링크 (pokefesta30://auth?token=…) 가 cold-start 시 expo-router 경로
 * 매칭에 실패해 여기(+not-found)로 떨어지는 경우를 처리.
 *
 * 핵심: expo-router 가 초기 URL 을 이미 소비하면 Linking.getInitialURL() 이
 * null 을 돌려준다. 그래서 reactive 훅인 expo-linking 의 useURL() 을 사용 —
 * 현재 활성 딥링크 URL 을 안정적으로 받아 token 을 직접 파싱한다.
 * (RN/Hermes 는 URLSearchParams 미지원 → 문자열 슬라이싱.)
 */
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

export default function NotFound() {
  const url = useURL();
  const navState = useRootNavigationState();
  const [handling, setHandling] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const token = tokenFromUrl(url);
    if (!token) return;
    done.current = true;
    setHandling(true);
    try {
      setSession({
        token,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        baseUrl: getApiBaseUrl(),
      });
    } catch {
      // ignore
    }
    // 루트 네비게이터가 준비된 뒤 이동.
    const go = () => router.replace('/' as never);
    if (navState?.key) go();
    else setTimeout(go, 120);
  }, [url, navState?.key]);

  if (handling) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <ActivityIndicator color={colors.ink} />
        <PixelText variant="pixel" size={10} color={colors.ink3}>
          로그인 처리 중…
        </PixelText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppBar title="없는 화면" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <PixelText variant="pixel" size={14} color={colors.ink}>
          404
        </PixelText>
        <PixelText variant="pixel" size={10} color={colors.ink3} style={{ marginTop: 12 }}>
          존재하지 않는 페이지입니다
        </PixelText>
      </View>
    </View>
  );
}
