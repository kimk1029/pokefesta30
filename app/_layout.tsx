import { useEffect } from 'react';
import { Slot } from 'expo-router';
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
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [pixelLoaded] = usePressStart2P({ PressStart2P_400Regular });
  const [koLoaded] = useFonts({
    Galmuri11: require('../assets/fonts/Galmuri11.ttf'),
    Galmuri11_Bold: require('../assets/fonts/Galmuri11-Bold.ttf'),
  });
  const fontsReady = pixelLoaded && koLoaded;

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ChromeProvider>
        <PriceModeProvider>
          <PhoneShell>
            <Slot />
          </PhoneShell>
        </PriceModeProvider>
      </ChromeProvider>
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
