/**
 * /oauth?provider=kakao|naver|google — 앱 내부 WebView OAuth 화면.
 *
 * 외부 브라우저 / Custom Tabs / 딥링크에 의존하지 않고 WebView 안에서 OAuth 를
 * 진행한다. 서버가 성공 시 `pokefesta30://auth?token=<jwt>` 로 리다이렉트하면,
 * WebView 의 onShouldStartLoadWithRequest 에서 그 네비게이션을 가로채 토큰을 직접
 * 회수한다. → Chrome 없는 에뮬레이터/기기에서도 동작하고, 딥링크 라우팅 404 도
 * 발생하지 않는다.
 */
import { useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { colors } from '@/theme/tokens';
import {
  buildAuthUrl,
  extractOAuthToken,
  persistTokenAndGoHome,
  type AuthProvider,
} from '@/lib/oauth';

// 일부 provider 가 기본 WebView userAgent 를 거부(예: Google "disallowed_useragent")
// 하므로 표준 모바일 Chrome UA 로 위장해 호환성을 높인다.
const UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function normalizeProvider(p: string | undefined): AuthProvider {
  return p === 'naver' || p === 'google' ? p : 'kakao';
}

export default function OAuthWebView() {
  const { provider } = useLocalSearchParams<{ provider?: string }>();
  const [loading, setLoading] = useState(true);
  const done = useRef(false);

  const authProvider = normalizeProvider(provider);
  const authUrl = buildAuthUrl(authProvider);

  // 로그인 완료 리다이렉트인지 판별. 서버는 모바일 성공 시 https 브리지
  // (/auth/app-callback?token=) 로 보낸다. 과거 커스텀 스킴(pokefesta30://) 도 호환.
  const isReturnUrl = (url: string): boolean =>
    url.startsWith('pokefesta30://') || url.includes('/auth/app-callback');

  // 리턴 URL 을 가로채 토큰 회수. 있으면 세션 저장 후 홈, 없으면 로그인 화면으로.
  const handleReturn = (url: string): void => {
    if (done.current) return;
    done.current = true;
    const token = extractOAuthToken(url);
    if (token) persistTokenAndGoHome(token);
    else router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar barStyle="dark-content" />
      <AppBar onBack={() => router.back()} title="소셜 로그인" />
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: authUrl }}
          userAgent={UA}
          // 커스텀 스킴(pokefesta30://) 도 onShouldStartLoadWithRequest 로 전달되도록 허용.
          originWhitelist={['*']}
          // 로그인 완료 리다이렉트(https 브리지 또는 커스텀 스킴)를 가로채 토큰 회수 후
          // false 반환으로 네비게이션을 차단(브리지 페이지 로드/intent 발사 방지).
          onShouldStartLoadWithRequest={(req) => {
            if (isReturnUrl(req.url)) {
              handleReturn(req.url);
              return false;
            }
            return true;
          }}
          onNavigationStateChange={(nav: WebViewNavigation) => {
            if (isReturnUrl(nav.url)) handleReturn(nav.url);
          }}
          // 오버레이는 첫 페이지 로드까지만. 이후 단계(이메일→비밀번호 등)는 WebView 안에서
          // 진행하도록 두고, onLoadStart 로 다시 켜지 않는다. → 어떤 단계가 에러로 끝나
          // onLoadEnd 가 안 와도 스피너가 무한히 떠 있지 않는다.
          onLoadEnd={() => setLoading(false)}
          onHttpError={() => setLoading(false)}
          onError={(e) => {
            setLoading(false);
            const u = e.nativeEvent?.url;
            if (u && isReturnUrl(u)) handleReturn(u);
          }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
        />
        {loading ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.paper,
            }}
          >
            <ActivityIndicator color={colors.ink} />
            <PixelText variant="pixel" size={10} color={colors.ink3} style={{ marginTop: 12 }}>
              로그인 페이지 여는 중…
            </PixelText>
          </View>
        ) : null}
      </View>
    </View>
  );
}
