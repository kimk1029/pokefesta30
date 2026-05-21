/**
 * /my/* 리스트용 행 컴포넌트.
 * 웹 src/components/{FeedRow, TradeCard} 와 동일한 정보 밀도를 모바일 픽셀 스타일로 옮긴 것.
 */
import { View, Image } from 'react-native';
import { router } from 'expo-router';
import { PixelText } from '@/components/PixelText';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import type { MyFeedPost, MyTrade } from '@/lib/myApi';

interface FeedRowProps {
  post: MyFeedPost;
  onPress?: () => void;
}

export function MyFeedRow({ post, onPress }: FeedRowProps) {
  return (
    <PixelPress
      onPress={onPress ?? (() => router.push(`/feed` as never))}
      bg={colors.white}
      borderWidth={2}
      shadow={3}
      hi={null}
      lo={null}
      inner={0}
    >
      <View style={{ flexDirection: 'row', padding: 12, gap: 10 }}>
        <View style={{ width: 36, height: 36, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.pap2, alignItems: 'center', justifyContent: 'center' }}>
          <PixelText variant="pixel" size={16} color={colors.ink}>{post.user || '🐣'}</PixelText>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <PixelText variant="pixel" size={9} color={colors.ink}>🗣 커뮤니티</PixelText>
            <PixelText variant="pixel" size={8} color={colors.ink3}>{post.time}</PixelText>
          </View>
          {post.authorName ? (
            <PixelText variant="ko" size={9} color={colors.ink3} style={{ marginTop: 2 }} numberOfLines={1}>
              {post.authorName}
            </PixelText>
          ) : null}
          <PixelText variant="ko" size={11} color={colors.ink} style={{ marginTop: 6, lineHeight: 18 }} numberOfLines={3}>
            {post.text}
          </PixelText>
          {post.images && post.images.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
              {post.images.slice(0, 3).map((src, i) => (
                <Image key={i} source={{ uri: src }} style={{ width: 56, height: 56, borderWidth: 1, borderColor: colors.ink }} />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </PixelPress>
  );
}

interface TradeRowProps {
  trade: MyTrade;
  onPress?: () => void;
}

const TYPE_LABEL: Record<MyTrade['type'], { bg: string; fg: string; label: string }> = {
  buy: { bg: colors.blu, fg: colors.white, label: '삽니다' },
  sell: { bg: colors.red, fg: colors.white, label: '팝니다' },
};

const STATUS_LABEL: Partial<Record<NonNullable<MyTrade['status']>, { bg: string; fg: string; label: string }>> = {
  reserved: { bg: colors.yel, fg: colors.ink, label: '예약중' },
  done: { bg: colors.ink3, fg: colors.white, label: '거래완료' },
  cancelled: { bg: colors.ink3, fg: colors.white, label: '취소' },
};

export function MyTradeRow({ trade, onPress }: TradeRowProps) {
  const t = TYPE_LABEL[trade.type];
  const s = trade.status ? STATUS_LABEL[trade.status] : null;
  const dim = trade.status === 'done' || trade.status === 'cancelled';
  return (
    <PixelPress
      onPress={onPress ?? (() => router.push(`/trade` as never))}
      bg={colors.white}
      borderWidth={2}
      shadow={3}
      hi={null}
      lo={null}
      inner={0}
    >
      <View style={{ padding: 12, opacity: dim ? 0.55 : 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, backgroundColor: t.bg, borderColor: colors.ink, borderWidth: 1 }}>
            <PixelText variant="pixel" size={8} color={t.fg}>{t.label}</PixelText>
          </View>
          {s ? (
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, backgroundColor: s.bg, borderColor: colors.ink, borderWidth: 1 }}>
              <PixelText variant="pixel" size={8} color={s.fg}>{s.label}</PixelText>
            </View>
          ) : null}
          {trade.place ? (
            <PixelText variant="pixel" size={8} color={colors.ink3}>· {trade.place}</PixelText>
          ) : null}
          <View style={{ flex: 1 }} />
          <PixelText variant="pixel" size={8} color={colors.ink3}>{trade.time}</PixelText>
        </View>
        <PixelText variant="ko" size={12} color={colors.ink} weight="bold" numberOfLines={2}>
          {trade.title}
        </PixelText>
        <PixelText variant="pixel" size={10} color={colors.red} weight="bold" style={{ marginTop: 6, letterSpacing: 0.5 }}>
          {formatPrice(trade.price)}
        </PixelText>
      </View>
    </PixelPress>
  );
}

function formatPrice(raw: string): string {
  if (!raw) return '제안';
  const n = Number(raw.replace(/,/g, ''));
  if (Number.isFinite(n) && n > 0) return `₩${n.toLocaleString('ko-KR')}`;
  return raw;
}
