import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { setSession } from '@/lib/session';
import { getApiBaseUrl } from '@/lib/apiClient';
import { colors } from '@/theme/tokens';

/**
 * OAuth 딥링크 (pokefesta30://auth?token=…) 가 cold-start 시 expo-router 경로
 * 매칭에 실패해 여기(+not-found)로 떨어지는 경우가 있다. 이 화면이 실제로
 * 렌더되는 화면이므로, 여기서 토큰을 직접 잡아 세션 저장 후 홈으로 보낸다.
 *
 * 토큰 출처 (둘 다 시도):
 *   1) useGlobalSearchParams 의 token (라우터가 쿼리를 살려둔 경우)
 *   2) Linking.getInitialURL / 현재 URL 의 token= (라우터가 못 살린 경우)
 */
export default function NotFound() {
  const params = useGlobalSearchParams<{ token?: string }>();
  const [handling, setHandling] = useState(false);

  useEffect(() => {
    let alive = true;
    const consume = (token: string | null | undefined) => {
      if (!token || !alive) return false;
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
      setTimeout(() => router.replace('/' as never), 60);
      return true;
    };

    const fromParam = typeof params.token === 'string' ? params.token : '';
    if (consume(fromParam)) return;

    // 라우터가 쿼리를 못 살렸으면 원본 URL 에서 직접 추출.
    Linking.getInitialURL()
      .then((url) => {
        if (!url || !url.includes('token=')) return;
        const q = url.split('?')[1] ?? '';
        try {
          consume(new URLSearchParams(q).get('token'));
        } catch {
          // ignore
        }
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [params.token]);

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
