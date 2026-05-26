import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppBar } from '@/components/AppBar';
import { PixelText } from '@/components/PixelText';
import { PixelFrame } from '@/components/cv/PixelFrame';
import { PixelPress } from '@/components/cv/PixelPress';
import { colors } from '@/theme/tokens';
import {
  fetchMvcAuctions,
  fetchMvcLatestBids,
  mvcArticleUrl,
  mvcImgProxy,
  type MvcAuctionItem,
  type MvcLatestBid,
} from '@/services/marketplace';
import { useListingFavorites, type ListingFavorite } from '@/lib/useListingFavorites';

type BidMap = Record<number, MvcLatestBid | null>;

function fmtWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

/** 관심목록 메타 → 라이브 항목에 없을 때(오래된 경매) 최소 렌더용 항목. */
function favToItem(f: ListingFavorite): MvcAuctionItem {
  const articleId = Number(f.externalId);
  return {
    articleId,
    subject: f.title,
    writerNickname: '',
    commentCount: 0,
    readCount: 0,
    writtenAt: 0,
    writtenAgo: '',
    thumbnailUrl: f.imageUrl,
    costText: '',
    sourceUrl: mvcArticleUrl(articleId),
  };
}

/** 캐시된 호가로 합성 bid (라이브 호가가 아직 없을 때 임시). */
function synthBid(articleId: number, price: number | null): MvcLatestBid | undefined {
  if (price == null) return undefined;
  return { articleId, amount: price, content: '', commentCount: 0, writtenAt: 0 };
}

/** 라이브 항목 + 현재 호가 → 관심목록 저장 메타 (가격 스냅샷 포함). */
function favFromItem(item: MvcAuctionItem, bid: MvcLatestBid | null | undefined): ListingFavorite {
  return {
    source: 'mvc',
    externalId: String(item.articleId),
    title: item.subject,
    imageUrl: item.thumbnailUrl,
    price: bid?.amount ?? null,
    url: `/cards/mvc-auction/${item.articleId}`,
  };
}

export default function MvcAuctionScreen() {
  const [items, setItems] = useState<MvcAuctionItem[]>([]);
  const [bids, setBids] = useState<BidMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bidsRef = useRef<BidMap>({});

  const { isFav, toggle, favorites } = useListingFavorites('mvc');

  // 댓글 있는 글의 최종호가 배치 조회. fresh=true 면 이미 받은 것도 다시 조회.
  const loadBids = useCallback(async (targets: MvcAuctionItem[], fresh: boolean) => {
    const ids = targets
      .filter((it) => it.commentCount > 0)
      .map((it) => it.articleId)
      .filter((id) => fresh || !(id in bidsRef.current));
    if (ids.length === 0) return;
    const m = await fetchMvcLatestBids(ids);
    bidsRef.current = { ...bidsRef.current, ...m };
    setBids((prev) => ({ ...prev, ...m }));
  }, []);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const list = await fetchMvcAuctions(1);
        setItems(list);
        void loadBids(list, refresh);
      } catch (e) {
        setError(e instanceof Error ? e.message : '불러오기 실패');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadBids],
  );

  useEffect(() => {
    load();
  }, [load]);

  // 관심 항목은 라이브 리스트에 없을 수 있어(오래된 경매) 호가가 안 채워진다.
  // 관심 id 들은 항상 별도로 최신 호가를 직접 조회 → 리스트에서도 최신가 표시.
  const favKey = favorites.map((f) => f.externalId).join(',');
  useEffect(() => {
    const ids = favorites.map((f) => Number(f.externalId)).filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length === 0) return;
    fetchMvcLatestBids(ids)
      .then((m) => {
        bidsRef.current = { ...bidsRef.current, ...m };
        setBids((prev) => ({ ...prev, ...m }));
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favKey]);

  const favIdSet = new Set(favorites.map((f) => f.externalId));
  const liveById = new Map(items.map((it) => [String(it.articleId), it]));
  const pinned = favorites.map((f) => liveById.get(f.externalId) ?? favToItem(f));
  const rest = items.filter((it) => !favIdSet.has(String(it.articleId)));

  const renderRow = (item: MvcAuctionItem) => {
    const id = String(item.articleId);
    const favMeta = favorites.find((f) => f.externalId === id);
    // 최신 호가를 한 번이라도 받았으면(없음=null 포함) 그걸 신뢰. 아직이면 스냅샷으로 임시.
    const bid =
      item.articleId in bids
        ? bids[item.articleId]
        : favMeta
          ? synthBid(item.articleId, favMeta.price)
          : undefined;
    return (
      <AuctionRow
        key={id}
        item={item}
        bid={bid}
        fav={isFav(id)}
        onToggleFav={() => toggle(favFromItem(item, bids[item.articleId]))}
      />
    );
  };

  const isEmpty = !loading && !error && items.length === 0 && pinned.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppBar onBack={() => router.back()} title="MVC 경매" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 110, gap: 6 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <Header />

        {pinned.length > 0 && (
          <>
            <PixelText variant="pixel" size={9} color={colors.goldDk} style={{ marginTop: 2, letterSpacing: 0.5 }}>
              ★ 관심목록 {pinned.length}
            </PixelText>
            {pinned.map(renderRow)}
            <View style={{ height: 2, backgroundColor: colors.pap3, marginVertical: 2 }} />
          </>
        )}

        {rest.map(renderRow)}

        {loading && (
          <View style={{ paddingVertical: 28, alignItems: 'center' }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        )}
        {isEmpty && (
          <View style={{ paddingVertical: 28, alignItems: 'center' }}>
            <PixelText variant="ko" size={12} color={colors.ink3}>
              {error ? `불러오기 오류: ${error}` : '오늘 마감 경매가 없습니다.'}
            </PixelText>
          </View>
        )}
        {error && !loading && items.length > 0 && (
          <PixelText variant="ko" size={10} color={colors.ink3} style={{ textAlign: 'center' }}>
            일부 갱신 실패: {error}
          </PixelText>
        )}
      </ScrollView>
    </View>
  );
}

function Header() {
  return (
    <PixelFrame bg={colors.ink2} borderWidth={3} shadow={6} hi="rgba(255,255,255,0.12)" lo="rgba(0,0,0,0.5)">
      <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 30 }}>🔨</Text>
        <View style={{ flex: 1 }}>
          <PixelText variant="pixel" size={11} color={colors.gold}>
            오늘 마감 경매
          </PixelText>
          <PixelText variant="ko" size={10} color={colors.white} style={{ marginTop: 6, lineHeight: 15 }}>
            ★ 를 눌러 관심 경매로 추가하면 상단에 고정되고 최종호가가 갱신됩니다.
          </PixelText>
        </View>
      </View>
    </PixelFrame>
  );
}

function AuctionRow({
  item,
  bid,
  fav,
  onToggleFav,
}: {
  item: MvcAuctionItem;
  bid: MvcLatestBid | null | undefined;
  fav: boolean;
  onToggleFav: () => void;
}) {
  const hasComments = item.commentCount > 0;
  const bidLabel =
    bid == null
      ? hasComments
        ? '…'
        : '입찰 없음'
      : bid.amount != null
        ? fmtWon(bid.amount)
        : bid.content || '입찰';

  return (
    // 웹 .shop-card 재현: 썸네일 84(높이 채움) + 본문(제목/최종호가/메타), 별은 우상단 오버레이.
    <View style={{ position: 'relative' }}>
      <PixelPress onPress={() => router.push(`/cards/mvc-auction/${item.articleId}`)} bg={colors.white} borderWidth={3} shadow={6} hi={null} lo={null}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 }}>
          <View
            style={{
              width: 84,
              height: 84,
              backgroundColor: colors.ink2,
              borderColor: colors.ink,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: mvcImgProxy(item.thumbnailUrl) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 30 }}>🔨</Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            {/* 제목 — 웹 .sh-title (Galmuri regular, 2줄) */}
            <PixelText variant="ko" size={12} numberOfLines={2} style={{ lineHeight: 17, paddingRight: 22 }}>
              {item.subject}
            </PixelText>
            {/* 최종호가 — 제목 아래 좌측, 빨강 강조 */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 7 }}>
              <PixelText variant="pixel" size={7} color={colors.ink3}>
                최종호가
              </PixelText>
              <PixelText
                variant="pixel"
                size={14}
                color={hasComments ? colors.red : colors.ink3}
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {bidLabel}
              </PixelText>
            </View>
            {/* 메타 — 입찰 수 · 시각 */}
            <PixelText variant="pixel" size={8} color={colors.ink3} numberOfLines={1} style={{ marginTop: 6 }}>
              🔨 입찰 {item.commentCount}
              {item.writtenAgo ? `   🕒 ${item.writtenAgo}` : ''}
            </PixelText>
          </View>
        </View>
      </PixelPress>
      {/* 별 토글 — 우상단 오버레이 (행 onPress 보다 우선) */}
      <Pressable onPress={onToggleFav} hitSlop={10} style={{ position: 'absolute', top: 8, right: 8, padding: 4, zIndex: 2 }}>
        <Text style={{ fontSize: 20, lineHeight: 22, color: fav ? colors.gold : colors.ink4 }}>
          {fav ? '★' : '☆'}
        </Text>
      </Pressable>
    </View>
  );
}
