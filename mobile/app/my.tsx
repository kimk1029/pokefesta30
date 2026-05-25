/**
 * /my — 마이페이지 대시보드.
 * 실시간 데이터: /api/me/summary (인증 시) → 카드 보유 수, 거래/찜 글 수, 포인트, 레벨.
 * 미인증 시: 익명 더미 + 로그인 CTA.
 */
import { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { SectHd } from '@/components/cv/SectHd';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { InlineLoginGate } from '@/components/InlineLoginGate';
import { colors } from '@/theme/tokens';
import { CurrencySettingsItem } from '@/components/CurrencySettingsItem';
import { ThemeSettingsItem } from '@/components/ThemeSettingsItem';
import { fetchMySummary, type MySummary } from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';
import { isAuthenticated, setSession, subscribeSession } from '@/lib/session';

function useAuthed(): boolean {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  useEffect(() => {
    return subscribeSession(() => setAuthed(isAuthenticated()));
  }, []);
  return authed;
}

interface MenuItem {
  icon: string;
  label: string;
  desc?: string;
  badge?: string;
  disabled?: boolean;
  onPress?: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MyScreen() {
  const authed = useAuthed();
  const { data, error } = useAsync<MySummary>(
    fetchMySummary,
    [authed],
  );

  // 인라인 로그인 게이트 — 바텀 탭바는 PhoneShell 이 유지.
  if (!authed) {
    return (
      <InlineLoginGate
        title="마이"
        feature="마이페이지"
        description="포인트·레벨·거래 활동을 한눈에 보세요."
        icon="👤"
      />
    );
  }

  const summary = data ?? null;
  const points = summary?.inventory.points ?? 0;
  const level = summary?.level.level ?? 1;
  const userName = summary?.user.name ?? '게스트';
  const cardCount = summary?.counts.cardCount ?? 0;
  const tradeCount = summary?.counts.tradeCount ?? 0;
  const savedCount = summary?.counts.savedCount ?? 0;

  // 웹 마이페이지(/my)와 동일한 메뉴 구성.
  const sections: MenuSection[] = [
    {
      title: '내 활동',
      items: [
        { icon: '✉️', label: '쪽지함', desc: '거래 채팅', onPress: () => router.push('/my/messages' as never) },
        { icon: '🃏', label: '내 카드', desc: `${cardCount}장 보유 중`, onPress: () => router.push('/my/cards' as never) },
        { icon: '⭐', label: '관심카드', desc: '찜한 시세 카드', onPress: () => router.push('/my/favorites' as never) },
        { icon: '📝', label: '내가 쓴 거래글', desc: `${tradeCount}건`, onPress: () => router.push('/my/trades' as never) },
        { icon: '🗣', label: '내 피드', desc: '내가 쓴 커뮤니티 글', onPress: () => router.push('/my/feeds' as never) },
        { icon: '💛', label: '찜한 글', desc: `${savedCount}건`, onPress: () => router.push('/my/bookmarks' as never) },
      ],
    },
    {
      title: '상점 바로가기',
      items: [
        { icon: '🛒', label: '포케30 상점', desc: '아바타·배경·테두리', onPress: () => router.push('/my/shop' as never) },
        { icon: '🎲', label: '오리파 · 뽑기', desc: '포인트로 박스 뽑기', onPress: () => router.push('/my/oripa' as never) },
      ],
    },
  ];

  // 설정 섹션의 내비게이션 항목 (통화/테마는 전용 컴포넌트로 별도 렌더).
  const settingsNav: MenuItem[] = [
    { icon: '📢', label: '공지사항', badge: 'NEW', onPress: () => router.push('/my/notices' as never) },
    { icon: '❓', label: 'FAQ · 자주 묻는 질문', onPress: () => router.push('/my/faq' as never) },
    { icon: '📜', label: '이용약관', onPress: () => router.push('/legal?doc=terms' as never) },
    { icon: '🔒', label: '개인정보처리방침', onPress: () => router.push('/legal?doc=privacy' as never) },
    { icon: '🔔', label: '알림 설정', desc: '준비중', disabled: true },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.replace('/' as never)} title="마이" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}>
        {/* Profile hero */}
        <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
          <PixelFrame
            bg={colors.ink2}
            borderWidth={4}
            shadow={7}
            hi="rgba(255,255,255,0.08)"
            lo="rgba(0,0,0,0.4)"
            inner={4}
          >
            <View style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 60, height: 60, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderColor: colors.ink, borderWidth: 3 }}>
                  <Text style={{ fontSize: 30 }}>🃏</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PixelText variant="pixel" size={14} color={colors.white} style={{ letterSpacing: 1 }} numberOfLines={1}>
                    {userName}
                  </PixelText>
                  <PixelText variant="pixel" size={10} color={colors.gold} style={{ marginTop: 6, letterSpacing: 0.5 }} numberOfLines={1}>
                    ★ LV.{level} · {points.toLocaleString('ko-KR')}P
                  </PixelText>
                </View>
                {authed ? (
                  <PixelPress onPress={() => undefined} bg={colors.gold} hi={colors.goldLt} lo={colors.goldDk} shadow={4}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                      <PixelText variant="pixel" size={10} color={colors.ink}>편집</PixelText>
                    </View>
                  </PixelPress>
                ) : (
                  <PixelPress onPress={() => router.push('/login' as never)} bg={colors.gold} hi={colors.goldLt} lo={colors.goldDk} shadow={4}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                      <PixelText variant="pixel" size={10} color={colors.ink}>로그인</PixelText>
                    </View>
                  </PixelPress>
                )}
              </View>
              <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
                <Stat label="카드" value={`${cardCount}장`} />
                <Stat label="거래" value={`${tradeCount}건`} />
                <Stat label="찜" value={`${savedCount}건`} />
              </View>
              {!authed && error ? (
                <View style={{ marginTop: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <PixelText variant="ko" size={9} color={colors.white} style={{ lineHeight: 14, opacity: 0.7 }}>
                    로그인하면 카드·포인트·거래글이 동기화됩니다.
                  </PixelText>
                </View>
              ) : null}
            </View>
          </PixelFrame>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={{ marginHorizontal: 14, marginBottom: 14 }}>
            <SectHd title={section.title} />
            <PixelFrame>
              <View>
                {section.items.map((item, i) => (
                  <View key={item.label}>
                    <MenuRow item={item} />
                    {i < section.items.length - 1 ? <View style={{ height: 1, backgroundColor: colors.pap3, marginHorizontal: 14 }} /> : null}
                  </View>
                ))}
              </View>
            </PixelFrame>
          </View>
        ))}

        {/* 설정 — 통화/테마 토글 + 공지/FAQ/약관/개인정보/알림 (웹과 동일) */}
        <View style={{ marginHorizontal: 14, marginBottom: 14 }}>
          <SectHd title="설정" />
          <CurrencySettingsItem />
          <ThemeSettingsItem />
          <PixelFrame>
            <View>
              {settingsNav.map((item, i) => (
                <View key={item.label}>
                  <MenuRow item={item} />
                  {i < settingsNav.length - 1 ? <View style={{ height: 1, backgroundColor: colors.pap3, marginHorizontal: 14 }} /> : null}
                </View>
              ))}
            </View>
          </PixelFrame>
        </View>

        {/* 로그아웃 */}
        <View style={{ marginHorizontal: 14, marginBottom: 8 }}>
          <PixelPress
            onPress={() => {
              setSession(null);
              router.replace('/login' as never);
            }}
            bg={colors.white}
            shadow={4}
          >
            <View style={{ paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14 }}>🚪</Text>
              <PixelText variant="ko" size={12} color={colors.ink3} weight="bold">로그아웃</PixelText>
            </View>
          </PixelPress>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 2 }}>
      <PixelText variant="pixel" size={11} color={colors.gold} weight="bold">{value}</PixelText>
      <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.55)" style={{ marginTop: 4 }}>{label}</PixelText>
    </View>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  const disabled = item.disabled === true;
  return (
    <PixelPress
      onPress={disabled ? () => undefined : (item.onPress ?? (() => undefined))}
      bg={colors.white}
      hi={null}
      lo={null}
      shadow={0}
      borderWidth={0}
      inner={0}
    >
      <View style={{ paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.45 : 1 }}>
        <View style={{ width: 36, height: 36, backgroundColor: colors.pap3, borderColor: colors.ink, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PixelText variant="ko" size={12} color={colors.ink} weight="bold" numberOfLines={1}>{item.label}</PixelText>
          {item.desc ? (
            <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 2 }} numberOfLines={1}>{item.desc}</PixelText>
          ) : null}
        </View>
        {item.badge ? (
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.red, borderColor: colors.ink, borderWidth: 2 }}>
            <PixelText variant="pixel" size={9} color={colors.white} weight="bold">{item.badge}</PixelText>
          </View>
        ) : null}
        {!disabled ? <PixelText variant="pixel" size={14} color={colors.ink3}>▶</PixelText> : null}
      </View>
    </PixelPress>
  );
}
