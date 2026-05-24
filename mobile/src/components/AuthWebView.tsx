/**
 * 소셜 OAuth WebView — Express `/auth/{provider}?platform=mobile` 로 진입,
 * 콜백 URL `pokefesta30://auth?token=<jwt>` 를 가로채 토큰을 부모에 전달.
 *
 * `/login` 전체 화면과 `InlineLoginGate` 가 공유하는 단일 구현.
 */
import { View, Pressable, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { PixelText } from '@/components/PixelText';
import { colors } from '@/theme/tokens';
import { getApiBaseUrl } from '@/lib/apiClient';

export type AuthProvider = 'kakao' | 'naver' | 'google';

const DEEP_LINK_SCHEME = 'pokefesta30://';

// OAuth 시작 오리진. 서버 state 가 HMAC 서명이라 쿠키 없이도 검증 가능 →
// Express 서버를 직접 호출. 만약 OAuth provider 콜백 URL 이 웹 도메인으로만
// 등록되어 있다면 EXPO_PUBLIC_WEB_OAUTH_ORIGIN 으로 override 가능.
const WEB_OAUTH_ORIGIN =
  process.env.EXPO_PUBLIC_WEB_OAUTH_ORIGIN ?? getApiBaseUrl();

interface Props {
  provider: AuthProvider;
  onCancel: () => void;
  onSuccess: (token: string, baseUrl: string) => void;
}

export function AuthWebView({ provider, onCancel, onSuccess }: Props) {
  const baseUrl = getApiBaseUrl();
  const startUrl = `${WEB_OAUTH_ORIGIN}/auth/${provider}?platform=mobile`;

  let handled = false;
  const tryHandle = (url: string): boolean => {
    if (handled || !url.startsWith(DEEP_LINK_SCHEME)) return false;
    // token= 가 들어있으면 직접 파싱 (new URL 이 커스텀 스킴에서 host 파싱이 들쭉날쭉).
    const qIdx = url.indexOf('token=');
    if (qIdx === -1) return false;
    const token = decodeURIComponent(url.slice(qIdx + 6).split('&')[0]);
    if (token) {
      handled = true;
      onSuccess(token, baseUrl);
    }
    return true;
  };

  const onShouldStartLoad = (req: { url: string }) => {
    if (req.url.startsWith(DEEP_LINK_SCHEME)) {
      if (!tryHandle(req.url)) {
        Alert.alert('로그인 실패', '토큰을 받지 못했어요.');
      }
      return false; // WebView 가 커스텀 스킴을 로드하지 않도록 차단
    }
    return true;
  };

  // Android 일부 케이스에서 302→커스텀스킴이 onShouldStartLoad 를 건너뛰므로
  // 네비게이션 상태 변화에서도 한 번 더 체크.
  const onNavStateChange = (st: { url?: string }) => {
    if (st.url) tryHandle(st.url);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View
        style={{
          paddingTop: 40,
          paddingHorizontal: 14,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Pressable
          onPress={onCancel}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 8,
            backgroundColor: colors.white,
            borderColor: colors.ink,
            borderWidth: 2,
          }}
        >
          <PixelText variant="pixel" size={11} color={colors.ink}>
            닫기
          </PixelText>
        </Pressable>
        <PixelText variant="pixel" size={11} color={colors.ink} style={{ flex: 1 }}>
          {provider.toUpperCase()} 로그인
        </PixelText>
      </View>
      <WebView
        source={{ uri: startUrl }}
        onShouldStartLoadWithRequest={onShouldStartLoad}
        onNavigationStateChange={onNavStateChange}
        javaScriptEnabled
        domStorageEnabled
        incognito={false}
        style={{ flex: 1 }}
      />
    </View>
  );
}
