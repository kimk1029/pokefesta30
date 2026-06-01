import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '@/lib/apiClient';
import { useToast } from '@/components/ToastProvider';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors, fonts } from '@/theme/tokens';

interface Props {
  apparelId: number;
  /** 컬렉션 저장 시 별칭으로 들어갈 카드명 (한국어 우선). */
  cardName?: string;
  /** 등록 시트에 표시할 이미지. */
  imageUrl?: string | null;
  /** 현재시세 (JPY) — 등록 시트 자동 표시/직접뽑기 기준가. */
  currentPriceJpy?: number | null;
}

type Status = 'idle' | 'loading' | 'error';

/**
 * 시세상세 페이지의 액션 줄 — 컬렉션/관심/SNKDUNK 외부 링크.
 * - 마운트 시 /api/me/cards · /api/me/favorites 조회해 ✓ 표시
 * - 성공/실패 시 토스트
 * - 미로그인 (401) 이면 login 라우트로 이동
 */
export function CardActions({ apparelId, cardName, imageUrl, currentPriceJpy }: Props) {
  const [favStatus, setFavStatus] = useState<Status>('idle');
  const [isCollected, setIsCollected] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [authed, setAuthed] = useState(true);
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
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) setAuthed(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [apparelId]);

  const goLogin = () => router.push('/login');

  // 바로 추가하지 않고 scan 의 "카드 등록" 시트로 이동 — 구매가/직접뽑기/등급 입력.
  const openRegisterSheet = () => {
    if (!authed) {
      goLogin();
      return;
    }
    router.push({
      pathname: '/scan',
      params: {
        regApparelId: String(apparelId),
        regName: cardName ?? '',
        regImage: imageUrl ?? '',
        regPrice: currentPriceJpy != null ? String(Math.round(currentPriceJpy)) : '',
      },
    } as never);
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
      <View style={styles.flex}>
        <PixelPress
          onPress={openRegisterSheet}
          bg={colors.blu}
          borderWidth={3}
          shadow={4}
          hi="rgba(255,255,255,0.35)"
          lo="rgba(0,0,0,0.25)"
          wrapStyle={styles.flex}
          innerStyle={styles.face}
        >
          <Text style={styles.icon}>{isCollected ? '✅' : '📦'}</Text>
          <Text style={[styles.label, styles.onColor]} numberOfLines={1}>
            내컬렉션
          </Text>
          <Text style={[styles.desc, styles.onColor]}>{isCollected ? '✓' : '추가'}</Text>
        </PixelPress>
      </View>
      <View style={styles.flex}>
        <PixelPress
          onPress={toggleFavorite}
          disabled={favStatus === 'loading'}
          bg={colors.pur}
          borderWidth={3}
          shadow={4}
          hi="rgba(255,255,255,0.35)"
          lo="rgba(0,0,0,0.25)"
          wrapStyle={styles.flex}
          innerStyle={styles.face}
        >
          <Text style={styles.icon}>{isFav ? '★' : '⭐'}</Text>
          <Text style={[styles.label, styles.onColor]} numberOfLines={1}>
            관심카드
          </Text>
          <Text style={[styles.desc, styles.onColor]}>
            {favStatus === 'loading' ? '...' : isFav ? '✓' : '추가'}
          </Text>
        </PixelPress>
      </View>
      <View style={styles.flex}>
        <PixelPress
          onPress={openSnkrdunk}
          bg={colors.ink}
          borderWidth={3}
          shadow={4}
          hi="rgba(255,255,255,0.2)"
          lo="rgba(0,0,0,0.35)"
          wrapStyle={styles.flex}
          innerStyle={styles.face}
        >
          <Text style={[styles.icon, styles.gold]}>↗</Text>
          <Text style={[styles.label, styles.gold]} numberOfLines={1}>
            SNKDUNK
          </Text>
          <Text style={[styles.desc, styles.gold]}>열기</Text>
        </PixelPress>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 14,
    // 상단 카드정보와의 간격을 70% 축소(기존 24px → 7px). 하단은 차트 섹션과 유지.
    marginTop: 7,
    marginBottom: 12,
  },
  flex: { flex: 1 },
  // 아이콘·텍스트·상태를 한 줄로 — 세로로 얇은 버튼.
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  icon: { color: colors.white, fontSize: 14, lineHeight: 16, flexShrink: 0 },
  label: {
    fontFamily: fonts.ko,
    fontSize: 11,
    letterSpacing: 0.2,
    includeFontPadding: false,
    flexShrink: 1,
  },
  desc: {
    fontFamily: fonts.ko,
    fontSize: 10,
    letterSpacing: 0.2,
    includeFontPadding: false,
    opacity: 0.85,
    flexShrink: 0,
  },
  onColor: { color: colors.white },
  gold: { color: colors.gold },
});
