/**
 * 로그인 화면.
 *
 * 소셜 로그인 버튼을 누르면 웹의 NextAuth signin 페이지를 WebView 로 열고,
 * 로그인이 끝나면 응답 쿠키 (`next-auth.session-token` 또는 `__Secure-...`)
 * 를 가로채서 [[session]] 모듈에 저장. 이후 모든 API 호출이 이 쿠키를 첨부한다.
 *
 * 쿠키 캡쳐 방식: WebView 안에서 `document.cookie` 를 매 페이지 로드마다 읽어
 * RN 쪽으로 postMessage. 보안상 next-auth 의 진짜 토큰 쿠키는 `HttpOnly` 라
 * document.cookie 로는 안 보이므로, 같은 정보가 담긴 [[/api/auth/session]]
 * 호출 결과 + WebView 의 onLoad 시점에 react-native-webview 의 자체 쿠키 매니저
 * (`CookieManager`) 를 통해 가져와야 한다. 이 구현은 후자를 사용한다.
 */
import { useState } from 'react';
import { View, ScrollView, Pressable, Text, Modal, Alert } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { router } from 'expo-router';
import { PixelText } from '@/components/PixelText';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { getWebBaseUrl } from '@/lib/apiClient';
import { setSession, isAuthenticated } from '@/lib/session';

type Provider = 'kakao' | 'naver' | 'google';

const PROVIDER_PATHS: Record<Provider, string> = {
  kakao: '/api/auth/signin/kakao',
  naver: '/api/auth/signin/naver',
  google: '/api/auth/signin/google',
};

export default function LoginScreen() {
  const [provider, setProvider] = useState<Provider | null>(null);

  const onSuccess = (cookieName: string, token: string, baseUrl: string, expiresAt: number | null) => {
    setSession({ cookieName, token, expiresAt, baseUrl });
    setProvider(null);
    Alert.alert('로그인 성공', '마이페이지로 이동합니다.');
    router.replace('/my' as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink2 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ marginTop: 60, alignItems: 'center', gap: 16, marginBottom: 36 }}>
          <Text style={{ fontSize: 52, lineHeight: 60 }}>🃏</Text>
          <PixelText variant="pixel" size={20} color={colors.gold} style={{ letterSpacing: 3 }}>
            CardVault
          </PixelText>
          <PixelText
            variant="pixel"
            size={10}
            color="rgba(255,255,255,0.55)"
            style={{ letterSpacing: 1, textAlign: 'center', lineHeight: 22 }}
          >
            내 카드를 가장 스마트하게{`\n`}스캔 · 아카이빙 · 거래 · 그레이딩
          </PixelText>
        </View>

        {isAuthenticated() ? (
          <View style={{ marginBottom: 24, padding: 12, backgroundColor: colors.grnDk, borderColor: colors.ink, borderWidth: 3 }}>
            <PixelText variant="pixel" size={10} color={colors.white} style={{ textAlign: 'center' }}>
              ✓ 이미 로그인되어 있어요
            </PixelText>
          </View>
        ) : null}

        <PixelText
          variant="pixel"
          size={9}
          color="rgba(255,255,255,0.3)"
          style={{ letterSpacing: 1, marginVertical: 16, textAlign: 'center' }}
        >
          ── 소셜 로그인 ──
        </PixelText>

        <View style={{ gap: 12 }}>
          <LoginBtn bg="#FEE500" fg="#3A1D00" icon="💬" name="카카오로 시작하기" desc="카카오 계정으로 간편 로그인" onPress={() => setProvider('kakao')} />
          <LoginBtn bg="#03C75A" fg={colors.white} icon="N" name="네이버로 시작하기" desc="네이버 계정으로 간편 로그인" onPress={() => setProvider('naver')} />
          <LoginBtn bg={colors.white} fg={colors.ink} icon="G" name="구글로 시작하기" desc="Google 계정으로 간편 로그인" onPress={() => setProvider('google')} />
        </View>

        <Pressable style={{ marginTop: 20, padding: 8, alignItems: 'center' }} onPress={() => router.replace('/' as never)}>
          <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.3)" style={{ letterSpacing: 1 }}>
            로그인 없이 둘러보기 →
          </PixelText>
        </Pressable>

        <PixelText variant="pixel" size={8} color="rgba(255,255,255,0.25)" style={{ marginTop: 20, textAlign: 'center', lineHeight: 14 }}>
          웹 베이스 URL: {getWebBaseUrl()}{'\n'}
          EXPO_PUBLIC_WEB_BASE_URL 환경변수로 변경
        </PixelText>
      </ScrollView>

      <Modal visible={provider !== null} animationType="slide" onRequestClose={() => setProvider(null)}>
        {provider ? (
          <AuthWebView
            provider={provider}
            onCancel={() => setProvider(null)}
            onSuccess={onSuccess}
          />
        ) : null}
      </Modal>
    </View>
  );
}

interface AuthWebViewProps {
  provider: Provider;
  onCancel: () => void;
  onSuccess: (cookieName: string, token: string, baseUrl: string, expiresAt: number | null) => void;
}

function AuthWebView({ provider, onCancel, onSuccess }: AuthWebViewProps) {
  const baseUrl = getWebBaseUrl();
  const startUrl = `${baseUrl}${PROVIDER_PATHS[provider]}`;
  const callbackHint = `${baseUrl}/`;

  /**
   * 로그인이 끝나면 NextAuth 가 콜백을 거쳐 callbackUrl 로 리다이렉트.
   * 이 시점에서 document.cookie 에는 (HttpOnly 가 아닌) 보조 쿠키만 들어 있다.
   * 진짜 세션 쿠키는 다음 페이지의 헤더 셋쿠키로 들어오는데, 웹뷰에서 그걸
   * 직접 잡으려면 `react-native-cookies` 같은 네이티브 패키지가 필요.
   *
   * 단순화: 콜백 도착 후 `/api/auth/session` 을 같은 웹뷰에서 한 번 더 호출.
   * 200 응답이면 로그인된 것으로 간주하고 쿠키 헤더를 추출하기 위해
   * fetch 를 inject 해서 결과를 RN 으로 메세지. 여기서는 best-effort 로
   * `next-auth.session-token` (또는 secure 변형) 이 document.cookie 에 있으면
   * 그대로 가져오도록 한다. HttpOnly 라면 사용자에게 다시 안내.
   */
  const inject = `
    (function(){
      function send(payload){
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
      function parseCookie(name) {
        var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : null;
      }
      function tryCapture() {
        var names = ['next-auth.session-token', '__Secure-next-auth.session-token'];
        for (var i=0;i<names.length;i++) {
          var v = parseCookie(names[i]);
          if (v) { send({type:'session', cookieName: names[i], token: v}); return true; }
        }
        return false;
      }
      tryCapture();
      // /api/auth/session 호출하여 로그인 여부 확인 + 쿠키 동기화 트리거
      try {
        fetch('/api/auth/session', { credentials: 'include' })
          .then(function(r){ return r.json(); })
          .then(function(j){
            if (j && j.user) {
              if (!tryCapture()) {
                send({type:'sessionInfo', user: j.user, note: 'cookie HttpOnly — capture failed'});
              }
            }
          })
          .catch(function(){});
      } catch(e){}
      true;
    })();
  `;

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as
        | { type: 'session'; cookieName: string; token: string }
        | { type: 'sessionInfo'; user: unknown; note: string };
      if (data.type === 'session') {
        // 30일 만료 가정 (NextAuth 기본)
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        onSuccess(data.cookieName, data.token, baseUrl, expiresAt);
      } else if (data.type === 'sessionInfo') {
        Alert.alert(
          '로그인되었지만 토큰을 캡쳐하지 못했어요',
          '웹 서버에서 NEXTAUTH_URL 을 모바일에서 접근 가능한 호스트로 두고, 세션 쿠키 HttpOnly 를 끄거나 별도 토큰 발급 엔드포인트를 사용해야 합니다.',
        );
      }
    } catch {
      /* ignore */
    }
  };

  const onNav = (nav: WebViewNavigation) => {
    // 콜백 URL 또는 마이페이지 도달 시 capture 재시도
    if (nav.url.startsWith(callbackHint)) {
      // inject 가 또 돌도록 약간 기다림 — WebView 가 alone-load 일 경우 대비
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ paddingTop: 40, paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={onCancel} style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.white, borderColor: colors.ink, borderWidth: 2 }}>
          <PixelText variant="pixel" size={11} color={colors.ink}>닫기</PixelText>
        </Pressable>
        <PixelText variant="pixel" size={11} color={colors.ink} style={{ flex: 1 }}>
          {provider.toUpperCase()} 로그인
        </PixelText>
      </View>
      <WebView
        source={{ uri: startUrl }}
        injectedJavaScript={inject}
        onMessage={onMessage}
        onNavigationStateChange={onNav}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        incognito={false}
        style={{ flex: 1 }}
      />
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
      <View style={{ paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, color: fg }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <PixelText variant="pixel" size={11} color={fg} style={{ letterSpacing: 1 }}>{name}</PixelText>
          <PixelText variant="pixel" size={9} color={fg} style={{ marginTop: 4, opacity: 0.65, letterSpacing: 0.3 }}>{desc}</PixelText>
        </View>
      </View>
    </PixelPress>
  );
}
