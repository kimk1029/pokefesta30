import { ScrollView, View, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { SectHd } from '@/components/cv/SectHd';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import { fmt } from '@/data/cardvault';
import { useCollection } from '@/lib/collection';

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
  const owned = useCollection();
  const totalVal = owned.reduce((a, c) => a + c.price, 0);

  const sections: MenuSection[] = [
    {
      title: '내 활동',
      items: [
        { icon: '📦', label: '내 컬렉션', desc: `${owned.length}장 보유 중`, onPress: () => router.push('/cards' as never) },
        { icon: '🛒', label: '거래 내역', desc: '판매·구매·교환', onPress: () => router.push('/feed' as never) },
        { icon: '🏆', label: '그레이딩 신청', desc: 'PSA · BGS · CGC', onPress: () => router.push('/scan' as never) },
        { icon: '💬', label: '메시지', desc: '거래 채팅', onPress: () => router.push('/messages' as never) },
      ],
    },
    {
      title: '계정',
      items: [
        { icon: '👤', label: '프로필 편집', desc: '닉네임·아바타' },
        { icon: '🔔', label: '알림 설정', desc: '거래·시세·시스템', badge: '3' },
        { icon: '🔐', label: '보안 / 비밀번호' },
        { icon: '🪪', label: '본인 인증' },
      ],
    },
    {
      title: '결제 / 포인트',
      items: [
        { icon: '🪙', label: '포인트 내역', desc: '1,280P 보유' },
        { icon: '💳', label: '결제 수단 관리' },
        { icon: '🧾', label: '구매 영수증' },
      ],
    },
    {
      title: '지원',
      items: [
        { icon: '❓', label: '자주 묻는 질문' },
        { icon: '📨', label: '1:1 문의' },
        { icon: '📜', label: '공지사항', badge: 'NEW' },
        { icon: '🛡', label: '약관 및 정책' },
      ],
    },
    {
      title: '앱 정보',
      items: [
        { icon: '🌐', label: '언어', desc: '한국어' },
        { icon: '🌙', label: '테마', desc: '레트로 픽셀' },
        { icon: '📱', label: '버전 정보', desc: 'v0.1.0' },
        { icon: '🚪', label: '로그아웃' },
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
                <View
                  style={{
                    width: 60,
                    height: 60,
                    backgroundColor: colors.gold,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: colors.ink,
                    borderWidth: 3,
                  }}
                >
                  <Text style={{ fontSize: 30 }}>🃏</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PixelText
                    variant="pixel"
                    size={14}
                    color={colors.white}
                    style={{ letterSpacing: 1 }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    CardCollector_KR
                  </PixelText>
                  <PixelText variant="pixel" size={10} color={colors.gold} style={{ marginTop: 6, letterSpacing: 0.5 }} numberOfLines={1}>
                    ★ 다이아 컬렉터 · LV.12
                  </PixelText>
                </View>
                <PixelPress onPress={() => undefined} bg={colors.gold} hi={colors.goldLt} lo={colors.goldDk} shadow={4}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                    <PixelText variant="pixel" size={10} color={colors.ink}>편집</PixelText>
                  </View>
                </PixelPress>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
                <Stat label="포트폴리오" value={`₩${fmt(totalVal)}`} />
                <Stat label="포인트" value="1,280P" />
                <Stat label="레벨" value="LV.12" />
              </View>
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
      <PixelText variant="pixel" size={11} color={colors.gold} weight="bold">
        {value}
      </PixelText>
      <PixelText variant="pixel" size={9} color="rgba(255,255,255,0.55)" style={{ marginTop: 4 }}>
        {label}
      </PixelText>
    </View>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <PixelPress
      onPress={item.onPress ?? (() => undefined)}
      bg={colors.white}
      hi={null}
      lo={null}
      shadow={0}
      borderWidth={0}
      inner={0}
    >
      <View style={{ paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            backgroundColor: colors.pap3,
            borderColor: colors.ink,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18 }}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PixelText variant="ko" size={12} color={colors.ink} weight="bold" numberOfLines={1}>
            {item.label}
          </PixelText>
          {item.desc ? (
            <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 2 }} numberOfLines={1}>
              {item.desc}
            </PixelText>
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
