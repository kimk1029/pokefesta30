/**
 * /legal?doc=terms|privacy — 약관/개인정보처리방침 WebView.
 *
 * 웹(poke-30.com)의 /terms · /privacy 페이지를 그대로 보여줘 내용이 항상 동기화된다.
 * 별도 OAuth 가로채기 로직 없이 단순 표시 전용.
 */
import { useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { colors } from '@/theme/tokens';
import { WEB_OAUTH_ORIGIN } from '@/lib/oauth';

const DOCS = {
  terms: { path: '/terms', title: '이용약관' },
  privacy: { path: '/privacy', title: '개인정보처리방침' },
} as const;

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const [loading, setLoading] = useState(true);
  const meta = doc === 'privacy' ? DOCS.privacy : DOCS.terms;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar barStyle="dark-content" />
      <AppBar onBack={() => router.back()} title={meta.title} />
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: `${WEB_OAUTH_ORIGIN}${meta.path}` }}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState
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
              불러오는 중…
            </PixelText>
          </View>
        ) : null}
      </View>
    </View>
  );
}
