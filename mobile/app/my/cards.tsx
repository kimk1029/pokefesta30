/**
 * /my/cards — 내 카드 컬렉션.
 * GET /api/me/cards/with-prices 로 서버 저장된 카드 + 최근 시세를 가져온다.
 * 미로그인/네트워크 실패 시 빈 상태 UI 표시.
 */
import { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, Pressable, TextInput, Image } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { EmptyState, ErrorView, LoadingState } from '@/components/cv/ListState';
import { InlineLoginGate } from '@/components/InlineLoginGate';
import { colors, space } from '@/theme/tokens';
import { fetchMyCards, type MyCardRow } from '@/lib/myApi';
import { useAsync } from '@/lib/useAsync';
import { isAuthenticated, subscribeSession } from '@/lib/session';
import { useEffect } from 'react';

type ViewMode = 'grid' | 'list';

/** 로그인 상태를 반응형으로 구독 — 로그인 성공 시 자동으로 컬렉션 화면으로 전환. */
function useAuthed(): boolean {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  useEffect(() => {
    return subscribeSession(() => setAuthed(isAuthenticated()));
  }, []);
  return authed;
}

export default function MyCardsScreen() {
  const authed = useAuthed();

  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const { data, loading, error, refresh } = useAsync<MyCardRow[]>(fetchMyCards, [authed]);

  // 인라인 로그인 게이트 — 바텀 탭바는 PhoneShell 이 유지.
  if (!authed) {
    return (
      <InlineLoginGate
        title="내 컬렉션"
        feature="내 컬렉션"
        description="스캔·구매·거래한 카드와 시세를 한곳에서 관리하세요."
        icon="📦"
      />
    );
  }

  const cards = data ?? [];

  const filtered = useMemo(() => {
    if (search === '') return cards;
    const q = search.toLowerCase();
    return cards.filter((c) =>
      [c.nickname, c.cardId, c.ocrSetCode, c.ocrCardNumber, c.memo]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [cards, search]);

  const totalVal = filtered.reduce((s, c) => s + (c.latestPrice ?? 0), 0);
  const gradedN = filtered.filter((c) => c.gradeEstimate).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar title="내 컬렉션" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {loading && !data ? (
          <View style={{ paddingTop: 30 }}>
            <LoadingState />
          </View>
        ) : error ? (
          <View style={{ marginHorizontal: 14, marginTop: 14 }}>
            <ErrorView error={error} onRetry={refresh} />
          </View>
        ) : cards.length === 0 ? (
          <View style={{ marginHorizontal: 14, marginTop: 14 }}>
            <EmptyState
              icon="🃏"
              title="저장된 카드가 없어요"
              desc="카드를 스캔·그레이딩하면 내 컬렉션에 자동 저장됩니다."
              ctaLabel="카드 스캔하기"
              onCtaPress={() => router.push('/scan' as never)}
            />
          </View>
        ) : (
          <>
            {/* SUMMARY STRIP */}
            <View style={styles.strip}>
              <StripCell text={`총 ${filtered.length}장`} bg={colors.ink} fg={colors.gold} />
              <StripCell text={`₩${totalVal.toLocaleString('ko-KR')}`} bg={colors.gold} fg={colors.ink} />
              <StripCell text={`${gradedN}건 그레이딩`} bg={colors.pur} fg={colors.white} />
            </View>

            {/* SEARCH */}
            <View style={styles.search}>
              <PixelText variant="pixel" size={14}>🔍</PixelText>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="카드명, 세트, 번호 검색..."
                placeholderTextColor={colors.ink3}
                style={styles.searchInput}
              />
            </View>

            {/* TOOLBAR */}
            <View style={styles.toolbar}>
              <View style={{ flex: 1 }} />
              <Pressable style={[styles.viewBtn, view === 'grid' && styles.viewBtnOn]} onPress={() => setView('grid')}>
                <PixelText variant="pixel" size={13} color={view === 'grid' ? colors.gold : colors.ink}>⊞</PixelText>
              </Pressable>
              <Pressable style={[styles.viewBtn, view === 'list' && styles.viewBtnOn]} onPress={() => setView('list')}>
                <PixelText variant="pixel" size={13} color={view === 'list' ? colors.gold : colors.ink}>☰</PixelText>
              </Pressable>
            </View>

            {filtered.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <PixelText variant="pixel" size={10} color={colors.ink3}>검색 결과가 없어요</PixelText>
              </View>
            ) : view === 'grid' ? (
              <View style={styles.grid}>
                {filtered.map((c) => (
                  <View key={c.id} style={styles.gridItem}>
                    <Thumb card={c} mode="grid" />
                    <View style={{ padding: 8 }}>
                      <PixelText variant="ko" size={10} numberOfLines={1} style={{ marginBottom: 5 }} weight="bold">
                        {displayName(c)}
                      </PixelText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <PixelText variant="pixel" size={7} color={colors.ink3} numberOfLines={1}>
                          {c.ocrSetCode ?? '—'}
                        </PixelText>
                        {c.gradeEstimate ? <GradeBadge g={c.gradeEstimate} /> : null}
                      </View>
                      <PixelText variant="pixel" size={8} color={colors.grnDk} style={{ marginTop: 5 }}>
                        {priceLabel(c.latestPrice)}
                      </PixelText>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingHorizontal: space.gap }}>
                {filtered.map((c) => (
                  <View key={c.id} style={styles.listItem}>
                    <Thumb card={c} mode="list" />
                    <View style={{ flex: 1 }}>
                      <PixelText variant="ko" size={11} weight="bold" style={{ marginBottom: 6 }} numberOfLines={1}>
                        {displayName(c)}
                      </PixelText>
                      <PixelText variant="pixel" size={8} color={colors.ink3} style={{ marginBottom: 6 }} numberOfLines={1}>
                        {[c.ocrSetCode, c.ocrCardNumber].filter(Boolean).join(' · ') || '메타 없음'}
                      </PixelText>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                        {c.gradeEstimate ? <GradeBadge g={c.gradeEstimate} /> : null}
                        {typeof c.centeringScore === 'number' ? (
                          <PixelText variant="pixel" size={8} color={colors.ink3}>
                            CT {c.centeringScore.toFixed(0)}
                          </PixelText>
                        ) : null}
                      </View>
                      <PixelText variant="pixel" size={10} color={colors.grnDk}>
                        {priceLabel(c.latestPrice)}
                      </PixelText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function displayName(c: MyCardRow): string {
  if (c.nickname && c.nickname.length > 0) return c.nickname;
  if (c.cardId) return c.cardId;
  if (c.ocrSetCode && c.ocrCardNumber) return `${c.ocrSetCode} #${c.ocrCardNumber}`;
  if (c.ocrSetCode) return c.ocrSetCode;
  return '이름 없음';
}

function priceLabel(p: number | undefined): string {
  if (!p || p <= 0) return '시세 없음';
  return `₩${Math.round(p).toLocaleString('ko-KR')}`;
}

function Thumb({ card, mode }: { card: MyCardRow; mode: 'grid' | 'list' }) {
  const dim = mode === 'grid' ? { height: 90 } : { width: 52, height: 72 };
  if (card.photoUrl) {
    return <Image source={{ uri: card.photoUrl }} style={[dim, { backgroundColor: colors.ink2, borderColor: colors.ink, borderWidth: mode === 'list' ? 2 : 0 }]} resizeMode="cover" />;
  }
  return (
    <View style={[dim, { backgroundColor: colors.ink2, alignItems: 'center', justifyContent: 'center', borderColor: colors.ink, borderWidth: mode === 'list' ? 2 : 0 }]}>
      <PixelText variant="pixel" size={mode === 'grid' ? 28 : 22} color={colors.gold}>🃏</PixelText>
    </View>
  );
}

function StripCell({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={[styles.stripCell, { backgroundColor: bg }]}>
      <PixelText variant="pixel" size={9} color={fg}>{text}</PixelText>
    </View>
  );
}

function GradeBadge({ g }: { g: string }) {
  const num = Number(g.replace(/[^0-9.]/g, ''));
  const bg = num >= 10 ? colors.psa10 : num >= 9 ? colors.psa9 : num >= 8 ? colors.psa8 : colors.psa7;
  const fg = num >= 8 && num < 9 ? colors.white : colors.ink;
  return (
    <View style={[styles.grade, { backgroundColor: bg }]}>
      <PixelText variant="pixel" size={9} color={fg}>{g}</PixelText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    marginHorizontal: space.gap,
    marginTop: 14,
    marginBottom: space.cg,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  stripCell: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    marginHorizontal: space.gap,
    marginBottom: space.cg,
    borderWidth: 3,
    borderColor: colors.ink,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Galmuri11',
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 10,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.gap,
    marginBottom: space.cg,
    gap: 4,
  },
  viewBtn: {
    width: 32,
    height: 32,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnOn: { backgroundColor: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.gap, gap: 8 },
  gridItem: { width: '31%', backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    padding: 12,
    marginBottom: space.cg,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  grade: {
    minWidth: 28,
    height: 22,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
