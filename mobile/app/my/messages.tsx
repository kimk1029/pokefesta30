/**
 * /my/messages — 쪽지함.
 * GET /api/messages 로 쓰레드 목록을 가져와 표시.
 * 행 탭 시 /messages/[peerId] 로 이동 (기존 mock UI 와 연결).
 */
import { ScrollView, View, Text } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelPress } from '@/components/cv/PixelPress';
import { SectHd } from '@/components/cv/SectHd';
import { EmptyState, ErrorView, LoadingState } from '@/components/cv/ListState';
import { colors } from '@/theme/tokens';
import { fetchMessageThreads, type MessageThread } from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';

export default function MyMessagesScreen() {
  const { data, loading, error, refresh } = useAsync(fetchMessageThreads);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title="쪽지함" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}>
        <View style={{ marginHorizontal: 14 }}>
          {loading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorView error={error} onRetry={refresh} />
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon="💬"
              title="아직 받은 쪽지가 없어요"
              desc="거래글 상세에서 1:1 쪽지를 보내거나 받으면 여기 표시됩니다."
              ctaLabel="거래 둘러보기"
              onCtaPress={() => router.push('/trade' as never)}
            />
          ) : (
            <>
              <SectHd title={`쪽지함 · ${data.length}명`} />
              <View style={{ gap: 8 }}>
                {data.map((t) => (
                  <ThreadRow key={t.peerId} thread={t} />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ThreadRow({ thread }: { thread: MessageThread }) {
  return (
    <PixelPress
      onPress={() => router.push(`/messages/${thread.peerId}` as never)}
      bg={colors.white}
      borderWidth={2}
      shadow={3}
      hi={null}
      lo={null}
      inner={0}
    >
      <View style={{ flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center' }}>
        <View style={{ width: 42, height: 42, borderColor: colors.ink, borderWidth: 2, backgroundColor: colors.pap2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>{renderAvatar(thread.peerAvatar)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PixelText variant="ko" size={12} weight="bold" color={colors.ink} style={{ flex: 1 }} numberOfLines={1}>
              {thread.peerName}
            </PixelText>
            <PixelText variant="pixel" size={8} color={colors.ink3}>{relTime(thread.lastAt)}</PixelText>
          </View>
          <PixelText variant="ko" size={10} color={colors.ink3} style={{ marginTop: 6, lineHeight: 14 }} numberOfLines={1}>
            {thread.lastFromMe ? '나: ' : ''}{thread.lastText}
          </PixelText>
        </View>
        {thread.unread > 0 ? (
          <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, backgroundColor: colors.red, borderColor: colors.ink, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }}>
            <PixelText variant="pixel" size={9} color={colors.white} weight="bold">
              {thread.unread > 99 ? '99+' : thread.unread}
            </PixelText>
          </View>
        ) : null}
      </View>
    </PixelPress>
  );
}

function renderAvatar(v: string | null | undefined): string {
  if (!v) return '🐣';
  // emoji 만 들어오면 그대로, avatarId (예: 'cat') 면 첫 글자 대신 일반 이모지로 fallback
  if (/^[\p{Emoji}\p{Extended_Pictographic}]/u.test(v)) return v;
  return '🃏';
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (mins <= 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}
