/**
 * /my — 마이페이지 대시보드.
 * 실시간 데이터: /api/me/summary (인증 시) → 카드 보유 수, 거래/찜 글 수, 포인트, 레벨.
 * 미인증 시: 익명 더미 + 로그인 CTA.
 */
import { ScrollView, View, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { SectHd } from '@/components/cv/SectHd';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { fetchMySummary, type MySummary } from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';
import { isAuthenticated, setSession } from '@/lib/session';

interface MenuItem {
  icon: string;
  label: string;
  desc?: string;
  badge?: string;
  onPress?: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MyScreen() {
  const authed = isAuthenticated();
  const { data, error } = useAsync<MySummary>(
    fetchMySummary,
    [authed],
  );

  const summary = data ?? null;
  const points = summary?.inventory.points ?? 0;
  const level = summary?.level.level ?? 1;
  const userName = summary?.user.name ?? '게스트';
  const cardCount = summary?.counts.cardCount ?? 0;
  const tradeCount = summary?.counts.tradeCount ?? 0;
  const savedCount = summary?.counts.savedCount ?? 0;

  const sections: MenuSection[] = [
    {
      title: '내 활동',
      items: [
        { icon: '📦', label: '내 컬렉션', desc: `${cardCount}장 보유 중`, onPress: () => router.push('/my/cards' as never) },
        { icon: '📝', label: '내 피드', desc: '내가 쓴 커뮤니티 글', onPress: () => router.push('/my/feeds' as never) },
        { icon: '🛒', label: '내 거래글', desc: `${tradeCount}건`, onPress: () => router.push('/my/trades' as never) },
        { icon: '🔖', label: '찜한 글', desc: `${savedCount}건`, onPress: () => router.push('/my/bookmarks' as never) },
        { icon: '💬', label: '쪽지함', desc: '거래 채팅', onPress: () => router.push('/my/messages' as never) },
        { icon: '🏆', label: '카드 스캔 · 그레이딩', desc: 'PSA · BGS · CGC', onPress: () => router.push('/scan' as never) },
      ],
    },
    {
      title: '포인트 · 샵',
      items: [
        { icon: '🏪', label: '꾸미기 샵', desc: '아바타·배경·테두리', onPress: () => router.push('/my/shop' as never) },
        { icon: '🎲', label: '오리파 뽑기', desc: '포인트로 박스 뽑기', onPress: () => router.push('/my/oripa' as never) },
        { icon: '🪙', label: '포인트', desc: `${points.toLocaleString('ko-KR')}P 보유` },
      ],
    },
    {
      title: '계정',
      items: [
        { icon: '👤', label: '프로필 편집', desc: userName },
        { icon: '🔔', label: '알림 설정', desc: '거래·시세·시스템' },
        { icon: '🔐', label: '보안 / 비밀번호' },
        ...(authed
          ? [{
              icon: '🚪',
              label: '로그아웃',
              onPress: () => {
                setSession(null);
                router.replace('/login' as never);
              },
            } as MenuItem]
          : [{
              icon: '🔓',
              label: '로그인',
              onPress: () => router.push('/login' as never),
            } as MenuItem]),
      ],
    },
    {
      title: '지원',
      items: [
        { icon: '❓', label: '자주 묻는 질문', onPress: () => router.push('/my/faq' as never) },
        { icon: '📜', label: '공지사항', badge: 'NEW', onPress: () => router.push('/my/notices' as never) },
        { icon: '📨', label: '1:1 문의' },
        { icon: '🛡', label: '약관 및 정책' },
      ],
    },
    {
      title: '앱 정보',
      items: [
        { icon: '🌐', label: '언어', desc: '한국어' },
        { icon: '🌙', label: '테마', desc: '레트로 픽셀' },
        { icon: '📱', label: '버전 정보', desc: 'v0.1.0' },
      ],
    },
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
  return (
    <PixelPress onPress={item.onPress ?? (() => undefined)} bg={colors.white} hi={null} lo={null} shadow={0} borderWidth={0} inner={0}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
        <PixelText variant="pixel" size={14} color={colors.ink3}>▶</PixelText>
      </View>
    </PixelPress>
  );
}
