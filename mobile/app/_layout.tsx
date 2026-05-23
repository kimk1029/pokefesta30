import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
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
import { colors } from '@/theme/tokens';

// preventAutoHideAsync 를 호출하지 않음 → splash 가 JS 로드되면 자동으로 사라짐.
// 폰트는 백그라운드로 로딩되며, 로딩 전엔 시스템 폰트로 폴백.

export default function RootLayout() {
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
