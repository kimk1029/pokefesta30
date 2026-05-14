import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { colors } from '@/theme/tokens';
import { StatusBar } from './StatusBar';
import { Tabbar } from './Tabbar';
import { useChrome } from './ChromeContext';

interface Props {
  children: React.ReactNode;
}

/**
 * Phone shell — wraps every screen with status bar + content + tabbar.
 * Login is a fullscreen overlay that hides status/tabbar.
 */
export function PhoneShell({ children }: Props) {
  const pathname = usePathname();
  const { hidden } = useChrome();
  const isLogin = pathname?.startsWith('/login');
  const isFullscreen = isLogin || hidden;
  return (
    <View style={styles.root}>
      <SafeAreaView
        style={styles.shell}
        edges={isFullscreen ? [] : ['top', 'bottom']}
      >
        {!isFullscreen ? <StatusBar /> : null}
        <View style={styles.screen}>{children}</View>
        {!isFullscreen ? <Tabbar /> : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pap2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 414 : undefined,
    backgroundColor: colors.paper,
    ...(Platform.OS === 'web'
      ? {
          borderWidth: 6,
          borderColor: colors.ink,
          shadowColor: colors.ink,
          shadowOffset: { width: 10, height: 10 },
          shadowOpacity: 1,
          shadowRadius: 0,
        }
      : {}),
  },
  screen: { flex: 1 },
});
