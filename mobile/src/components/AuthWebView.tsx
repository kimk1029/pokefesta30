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

// OAuth 는 반드시 웹 오리진(HTTPS) 을 통과해야 한다 —
// 1) Express 가 굽는 state 쿠키가 secure: true 라 HTTP 직통 Synology 에선 저장 안 됨
// 2) Kakao/Naver/Google 콘솔에 등록된 콜백 도메인과 시작 도메인이 같아야 쿠키가 살아남음
// 일반 API 는 apiClient 가 그대로 Synology 직통 (Authorization: Bearer 이라 쿠키 무관).
const WEB_OAUTH_ORIGIN = process.env.EXPO_PUBLIC_WEB_OAUTH_ORIGIN ?? 'https://www.poke-30.com';

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
