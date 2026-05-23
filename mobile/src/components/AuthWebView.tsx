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

  const onShouldStartLoad = (req: { url: string }) => {
    if (req.url.startsWith(DEEP_LINK_SCHEME)) {
      try {
        const u = new URL(req.url);
        const token = u.searchParams.get('token');
        if (token) {
          onSuccess(token, baseUrl);
        } else {
          Alert.alert('로그인 실패', '토큰을 받지 못했어요.');
        }
      } catch {
        Alert.alert('로그인 실패', '응답 URL 을 해석하지 못했어요.');
      }
      return false;
    }
    return true;
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
        javaScriptEnabled
        domStorageEnabled
        incognito={false}
        style={{ flex: 1 }}
      />
    </View>
  );
}
