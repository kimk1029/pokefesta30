import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  useFonts as usePressStart2P,
  PressStart2P_400Regular,
} from '@expo-google-fonts/press-start-2p';
import { PhoneShell } from '@/components/PhoneShell';
import { ChromeProvider } from '@/components/ChromeContext';
import { PriceModeProvider } from '@/lib/priceMode';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/ToastProvider';
import { setSession } from '@/lib/session';
import { getApiBaseUrl } from '@/lib/apiClient';
import { colors } from '@/theme/tokens';

/**
 * OAuth 딥링크 (pokefesta30://auth?token=…) 를 expo-router 경로 매칭에 의존하지
 * 않고 직접 처리. WebView 인터셉트가 놓치거나 OS 가 cold-start 로 앱을 열어도
 * 여기서 토큰을 잡아 세션 저장 후 홈으로 보낸다.
 */
// React Native(Hermes) 는 URLSearchParams 를 완전히 지원하지 않아 수동 파싱.
function extractToken(url: string | null): string | null {
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

function useOAuthDeepLink() {
  useEffect(() => {
    const handle = (url: string | null) => {
      const token = extractToken(url);
      if (!token) return;
      try {
        setSession({
          token,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          baseUrl: getApiBaseUrl(),
        });
      } catch (e) {
        console.warn('[deeplink] setSession failed', e);
      }
      // 약간 지연시켜 라우터가 마운트된 뒤 이동.
      setTimeout(() => router.replace('/' as never), 60);
    };
    Linking.getInitialURL().then(handle).catch(() => undefined);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);
}

// preventAutoHideAsync 를 호출하지 않음 → splash 가 JS 로드되면 자동으로 사라짐.
// 폰트는 백그라운드로 로딩되며, 로딩 전엔 시스템 폰트로 폴백.

export default function RootLayout() {
  useOAuthDeepLink();
  const [pixelLoaded, pixelError] = usePressStart2P({ PressStart2P_400Regular });
  const [koLoaded, koError] = useFonts({
    Galmuri11: require('../assets/fonts/Galmuri11.ttf'),
    Galmuri11_Bold: require('../assets/fonts/Galmuri11-Bold.ttf'),
  });
  const fontsReady = pixelLoaded && koLoaded;
  // 5초 안에 폰트 로딩이 안 끝나면 시스템 폰트로 폴백 (앱이 영원히 스플래시에 갇히지 않도록).
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (fontsReady) return undefined;
    const t = setTimeout(() => {
      console.warn('[RootLayout] font load timed out at 5s — falling back to system fonts');
      setTimedOut(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [fontsReady]);

  const proceed = fontsReady || timedOut || pixelError != null || koError != null;

  // 안전망: 어떤 경우든 마운트 후 splash 강제 숨김.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!proceed) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>
            <ChromeProvider>
              <PriceModeProvider>
                <PhoneShell>
            {/*
             * Stack 으로 전환해 라우트 변경 시 네이티브 슬라이드/페이드 트랜지션 적용.
             * PhoneShell 이 외부에 있으므로 StatusBar / Tabbar 는 고정되고,
             * 페이지 컨텐츠 영역만 애니메이션된다.
             */}
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 260,
                contentStyle: { backgroundColor: colors.paper },
              }}
            >
              {/* 홈 — 탭 사이 이동 느낌이 더 부드러운 fade */}
              <Stack.Screen name="index" options={{ animation: 'fade', animationDuration: 180 }} />
              {/* 스캔 — 하단에서 솟구치는 모달 느낌 */}
              <Stack.Screen
                name="scan"
                options={{ animation: 'slide_from_bottom', animationDuration: 320 }}
              />
              {/* 로그인 — 전체화면 페이드 */}
              <Stack.Screen
                name="login"
                options={{ animation: 'fade', animationDuration: 220 }}
              />
            </Stack>
                </PhoneShell>
              </PriceModeProvider>
            </ChromeProvider>
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.pap2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
