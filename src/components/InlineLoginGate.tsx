/**
 * 인라인 로그인 게이트 — 페이지 내부에 렌더되어 바텀 탭바를 그대로 유지한다.
 * `/login` 전체화면(다크 네이비)과는 별개의 라이트 테마 디자인.
 *
 * 미로그인 사용자가 컬렉션 / 마이 탭을 눌렀을 때 페이지 자리에 표시.
 * 소셜 로그인 흐름은 `AuthWebView` 모달로 동일하게 처리.
 */
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { setSession } from '@/lib/session';
import { AuthWebView, type AuthProvider } from './AuthWebView';

interface Props {
  /** 페이지 상단 AppBar 타이틀. */
  title: string;
  /** 게이트 안에 표시할 잠긴 기능 이름. 예: "내 컬렉션". */
  feature: string;
  /** 잠긴 기능 설명. */
  description?: string;
  /** 잠긴 영역 아이콘 (기본 🔒). */
  icon?: string;
}

export function InlineLoginGate({ title, feature, description, icon = '🔒' }: Props) {
  const [provider, setProvider] = useState<AuthProvider | null>(null);

  const onSuccess = (token: string, baseUrl: string) => {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    setSession({ token, expiresAt, baseUrl });
    setProvider(null);
    Alert.alert('로그인 성공', `${feature}을(를) 이용할 수 있어요.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.replace('/' as never)} title={title} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Lock hero — 잠긴 기능 안내 */}
        <View style={{ marginBottom: 16 }}>
          <PixelFrame
            bg={colors.gold}
            borderWidth={4}
            shadow={6}
            hi="rgba(255,255,255,0.55)"
            lo="rgba(0,0,0,0.18)"
            inner={3}
          >
            <View
              style={{
                paddingVertical: 22,
                paddingHorizontal: 18,
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  backgroundColor: colors.ink,
                  borderColor: colors.ink,
                  borderWidth: 3,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 28 }}>{icon}</Text>
              </View>
              <PixelText variant="pixel" size={10} color={colors.ink} style={{ letterSpacing: 1.5 }}>
                LOGIN REQUIRED
              </PixelText>
              <PixelText
                variant="ko"
                size={14}
                weight="bold"
                color={colors.ink}
                style={{ textAlign: 'center', lineHeight: 20 }}
              >
                {feature}을(를) 사용하려면{'\n'}로그인이 필요합니다
              </PixelText>
              {description ? (
                <PixelText
                  variant="ko"
                  size={11}
                  color={colors.ink}
                  style={{ textAlign: 'center', opacity: 0.7, lineHeight: 15 }}
                >
                  {description}
                </PixelText>
              ) : null}
            </View>
          </PixelFrame>
        </View>

        {/* Divider */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginVertical: 12,
          }}
        >
          <View style={{ flex: 1, height: 2, backgroundColor: colors.pap3 }} />
          <PixelText variant="pixel" size={9} color={colors.ink3} style={{ letterSpacing: 1 }}>
            소셜 로그인
          </PixelText>
          <View style={{ flex: 1, height: 2, backgroundColor: colors.pap3 }} />
        </View>

        {/* Compact social buttons — /login 의 큰 버튼보다 한 단계 작게. */}
        <View style={{ gap: 10 }}>
          <CompactLoginBtn
            bg="#FEE500"
            fg="#3A1D00"
            icon="💬"
            name="카카오로 로그인"
            onPress={() => setProvider('kakao')}
          />
          <CompactLoginBtn
            bg="#03C75A"
            fg={colors.white}
            icon="N"
            name="네이버로 로그인"
            onPress={() => setProvider('naver')}
          />
          <CompactLoginBtn
            bg={colors.white}
            fg={colors.ink}
            icon="G"
            name="구글로 로그인"
            onPress={() => setProvider('google')}
          />
        </View>

        <Pressable
          onPress={() => router.replace('/' as never)}
          style={{ marginTop: 18, padding: 12, alignItems: 'center' }}
        >
          <PixelText variant="pixel" size={9} color={colors.ink3} style={{ letterSpacing: 1 }}>
            ← 홈으로 돌아가기
          </PixelText>
        </Pressable>
      </ScrollView>

      <Modal
        visible={provider !== null}
        animationType="slide"
        onRequestClose={() => setProvider(null)}
      >
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

interface CompactBtnProps {
  bg: string;
  fg: string;
  icon: string;
  name: string;
  onPress: () => void;
}

function CompactLoginBtn({ bg, fg, icon, name, onPress }: CompactBtnProps) {
  return (
    <PixelPress
      onPress={onPress}
      bg={bg}
      borderWidth={3}
      shadow={5}
      hi="rgba(255,255,255,0.4)"
      lo="rgba(0,0,0,0.18)"
      inner={2}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            backgroundColor: 'rgba(0,0,0,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: 'rgba(0,0,0,0.12)',
            borderWidth: 1,
          }}
        >
          <Text style={{ fontSize: 17, color: fg, fontWeight: 'bold' }}>{icon}</Text>
        </View>
        <PixelText variant="pixel" size={11} color={fg} style={{ flex: 1, letterSpacing: 0.5 }}>
          {name}
        </PixelText>
      </View>
    </PixelPress>
  );
}
