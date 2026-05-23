import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '@/lib/apiClient';
import { useToast } from '@/components/ToastProvider';
import { colors, fonts } from '@/theme/tokens';

interface Props {
  apparelId: number;
  /** 컬렉션 저장 시 별칭으로 들어갈 카드명 (한국어 우선). */
  cardName?: string;
}

type Status = 'idle' | 'loading' | 'error';

/**
 * 시세상세 페이지의 액션 줄 — 컬렉션/관심/SNKDUNK 외부 링크.
 * - 마운트 시 /api/me/cards · /api/me/favorites 조회해 ✓ 표시
 * - 성공/실패 시 토스트
 * - 미로그인 (401) 이면 login 라우트로 이동
 */
export function CardActions({ apparelId, cardName }: Props) {
  const [collectStatus, setCollectStatus] = useState<Status>('idle');
  const [favStatus, setFavStatus] = useState<Status>('idle');
  const [isCollected, setIsCollected] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [favRes, cardRes] = await Promise.all([
          api<{ data?: Array<{ snkrdunkApparelId: number }> }>('/api/me/favorites'),
          api<{ data?: Array<{ snkrdunkApparelId: number | null }> }>('/api/me/cards'),
        ]);
        if (!alive) return;
        setIsFav((favRes?.data ?? []).some((r) => r.snkrdunkApparelId === apparelId));
        setIsCollected((cardRes?.data ?? []).some((r) => r.snkrdunkApparelId === apparelId));
      } catch {
        // 미로그인 가능성 — 무시
      }
    })();
    return () => {
      alive = false;
    };
  }, [apparelId]);

  const goLogin = () => router.push('/login');

  const addToCollection = async () => {
    if (collectStatus === 'loading') return;
    setCollectStatus('loading');
    try {
      await api('/api/me/cards', {
        method: 'POST',
        body: {
          snkrdunkApparelId: apparelId,
          nickname: cardName?.slice(0, 60) ?? undefined,
        },
      });
      setIsCollected(true);
      setCollectStatus('idle');
      toast.success('내 컬렉션에 추가되었습니다');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        goLogin();
        return;
      }
      setCollectStatus('error');
      const msg =
        err instanceof ApiError
          ? // 서버가 { error, code, message } 를 돌려주면 message 우선
            (err.body as { message?: string; error?: string } | null)?.message ??
            (err.body as { error?: string } | null)?.error ??
            `HTTP ${err.status}`
          : err instanceof Error
            ? err.message
            : '추가 실패';
      toast.error(`추가 실패: ${msg}`);
      setTimeout(() => setCollectStatus('idle'), 1500);
    }
  };

  const toggleFavorite = async () => {
    if (favStatus === 'loading') return;
    setFavStatus('loading');
    const wantOn = !isFav;
    try {
      if (wantOn) {
        await api('/api/me/favorites', {
          method: 'POST',
          body: { snkrdunkApparelId: apparelId },
        });
      } else {
        await api(`/api/me/favorites/${apparelId}`, { method: 'DELETE' });
      }
      setIsFav(wantOn);
      setFavStatus('idle');
      toast.success(wantOn ? '관심카드에 추가되었습니다' : '관심카드에서 제거되었습니다');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        goLogin();
        return;
      }
      setFavStatus('error');
      toast.error(`관심카드 ${wantOn ? '추가' : '제거'} 실패`);
      setTimeout(() => setFavStatus('idle'), 1200);
    }
  };

  const openSnkrdunk = () => {
    Linking.openURL(`https://snkrdunk.com/apparels/${apparelId}`).catch(() => undefined);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={addToCollection}
        disabled={collectStatus === 'loading'}
        style={[styles.btn, { backgroundColor: colors.blu }]}
      >
        <Text style={styles.icon}>{isCollected ? '✅' : '📦'}</Text>
        <Text style={styles.label}>내 컬렉션</Text>
        <Text style={styles.desc}>
          {collectStatus === 'loading' ? '...' : isCollected ? '✓' : '추가'}
        </Text>
      </Pressable>
      <Pressable
        onPress={toggleFavorite}
        disabled={favStatus === 'loading'}
        style={[styles.btn, { backgroundColor: colors.pur }]}
      >
        <Text style={styles.icon}>{isFav ? '★' : '⭐'}</Text>
        <Text style={styles.label}>관심카드</Text>
        <Text style={styles.desc}>
          {favStatus === 'loading' ? '...' : isFav ? '✓' : '추가'}
        </Text>
      </Pressable>
      <Pressable onPress={openSnkrdunk} style={[styles.btn, { backgroundColor: colors.ink }]}>
        <Text style={[styles.icon, { color: colors.gold }]}>↗</Text>
        <Text style={[styles.label, { color: colors.gold }]}>SNKDUNK</Text>
        <Text style={[styles.desc, { color: colors.gold }]}>열기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 14,
    marginVertical: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
    shadowColor: colors.ink,
    shadowOpacity: 1,
    shadowOffset: { width: 3, height: 3 },
    shadowRadius: 0,
    elevation: 3,
  },
  icon: { color: colors.white, fontSize: 18 },
  label: { color: colors.white, fontFamily: fonts.pixel, fontSize: 9, letterSpacing: 0.3 },
  desc: { color: colors.white, fontFamily: fonts.pixel, fontSize: 8, letterSpacing: 0.3 },
});
