'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { mvcImgProxy, stripDeadlinePrefix, type MvcAuctionItem, type MvcAuctionPageResult, type MvcLatestBid } from '@/lib/navercafe';
import { FavoriteStar } from '@/components/FavoriteStar';
import { useListingFavorites, type ListingFavorite } from '@/lib/useListingFavorites';

const MAX_PAGE = 30; // 안전 상한
const PAGES_PER_TRIGGER = 5; // 한 번 트리거에 빈 페이지를 건너뛰며 최대 탐색할 수
const BID_CHUNK = 25; // 최종호가 배치 조회 단위
const REFRESH_COOLDOWN = 20; // 새로고침 쿨다운(초)

type BidMap = Record<number, MvcLatestBid | null>;

/** 클라이언트용 KST 정확 시각(초까지): "오늘 21:33:07" / "05/24 21:33:07". */
function fmtClock(ts: number): string {
  if (!ts) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(ts));
  const time = `${get('hour')}:${get('minute')}:${get('second')}`;
  return today === day ? `오늘 ${time}` : `${get('month')}/${get('day')} ${time}`;
}

function fmtWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

/** 관심목록 메타 → 라이브 항목에 없을 때 최소 렌더용 항목. */
function favToItem(f: ListingFavorite): MvcAuctionItem {
  return {
    articleId: Number(f.externalId),
    subject: f.title,
    writerNickname: '',
    commentCount: 0,
    readCount: 0,
    writtenAt: 0,
    writtenAgo: '',
    lastCommentedAt: 0,
    thumbnailUrl: f.imageUrl,
    costText: '',
  };
}

/** 캐시된 호가로 합성 bid (라이브 호가가 아직 없을 때). */
function synthBid(articleId: number, price: number | null): MvcLatestBid | undefined {
  if (price == null) return undefined;
  return { articleId, amount: price, content: '', writerNickname: '', writtenAt: 0, writtenClock: '', commentCount: 0 };
}

/** 라이브 항목 + 현재 호가 → 관심목록 저장 메타. */
function favFromItem(item: MvcAuctionItem, bid: MvcLatestBid | null | undefined): ListingFavorite {
  return {
    source: 'mvc',
    externalId: String(item.articleId),
    title: stripDeadlinePrefix(item.subject) || item.subject,
    imageUrl: item.thumbnailUrl,
    price: bid?.amount ?? null,
    url: `/cards/mvc-auction/${item.articleId}`,
  };
}

function AuctionRow({
  item,
  bid,
  changed,
}: {
  item: MvcAuctionItem;
  bid: MvcLatestBid | null | undefined;
  changed: boolean;
}) {
  const hasComments = item.commentCount > 0;
  // 시각: 최신 호가 시각 > 마지막 댓글 시각 > 작성 시각
  const timeTs = bid?.writtenAt || item.lastCommentedAt || item.writtenAt;
  // 최종호가 칸엔 최신 입찰 '댓글 원문'을 그대로 노출. 댓글이 비어 있으면(관심목록
  // 스냅샷 등) 파싱 금액으로 폴백.
  const bidLabel =
    bid == null
      ? hasComments
        ? '…'
        : '입찰 없음'
      : bid.content
        ? bid.content
        : bid.amount != null
          ? fmtWon(bid.amount)
          : '입찰';

  return (
    <Link
      href={`/cards/mvc-auction/${item.articleId}`}
      className="shop-card"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="sh-icon"
        style={{
          width: 84,
          height: 84,
          background: 'var(--ink2)',
          color: 'var(--white)',
          overflow: 'hidden',
          alignSelf: 'stretch',
        }}
      >
        {item.thumbnailUrl ? (
          // 외부(네이버 카페) 이미지는 일반 <img> 사용
          // eslint-disable-next-line @next/next/no-img-element
          <img
            // 네이버 CDN은 우리 도메인 referer를 403 차단 → pstatic 이미지는 서버 프록시 경유
            src={mvcImgProxy(item.thumbnailUrl)}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: 30, display: 'grid', placeItems: 'center', height: '100%' }}>🔨</span>
        )}
      </div>
      <div className="sh-main">
        <div
          className="sh-title"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}
        >
          {stripDeadlinePrefix(item.subject)}
        </div>

        {/* 최종호가 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 7 }}>
          <span style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', letterSpacing: 0.5 }}>
            최종호가
          </span>
          <span
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 15,
              letterSpacing: 0.3,
              color: hasComments ? 'var(--red)' : 'var(--ink3)',
            }}
          >
            {bidLabel}
          </span>
          {changed && (
            <span
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 8,
                padding: '1px 4px',
                background: 'var(--grn)',
                color: 'var(--white)',
                letterSpacing: 0.5,
              }}
            >
              갱신
            </span>
          )}
        </div>

        {/* 입찰 수 + 정확 시각 */}
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--ink3)',
            marginTop: 6,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span>🔨 입찰 {item.commentCount}</span>
          {timeTs > 0 && <span>🕒 {fmtClock(timeTs)}</span>}
        </div>
      </div>
    </Link>
  );
}

interface Props {
  initial: MvcAuctionPageResult;
}

export function MvcAuctionList({ initial }: Props) {
  const [items, setItems] = useState<MvcAuctionItem[]>(initial.items);
  const [bids, setBids] = useState<BidMap>({});
  const [changedIds, setChangedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(initial.page);
  const [done, setDone] = useState(!initial.hasNext || initial.page >= MAX_PAGE);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(0);

  const { isFav, toggle, favorites } = useListingFavorites('mvc');

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const busy = useRef(false);
  const seen = useRef<Set<number>>(new Set(initial.items.map((i) => i.articleId)));
  const bidsRef = useRef<BidMap>({});

  // 주어진 articleId 들의 최종호가를 배치 조회. fresh=true 면 캐시 우회.
  const fetchBids = useCallback(async (ids: number[], fresh: boolean): Promise<BidMap> => {
    const collected: BidMap = {};
    for (let i = 0; i < ids.length; i += BID_CHUNK) {
      const chunk = ids.slice(i, i + BID_CHUNK);
      try {
        const res = await fetch(
          `/api/navercafe/latest-bids?ids=${chunk.join(',')}${fresh ? '&fresh=1' : ''}`,
        );
        const data = (await res.json()) as { bids: BidMap };
        Object.assign(collected, data.bids ?? {});
        bidsRef.current = { ...bidsRef.current, ...(data.bids ?? {}) };
        setBids((prev) => ({ ...prev, ...(data.bids ?? {}) }));
      } catch {
        // 무시 — 다음 새로고침에서 재시도
      }
    }
    return collected;
  }, []);

  // 라이브 목록용 — 댓글 있는 글만. fresh=true 면 캐시 우회.
  const loadBids = useCallback(
    (targets: MvcAuctionItem[], fresh: boolean): Promise<BidMap> => {
      const ids = targets
        .filter((it) => it.commentCount > 0)
        .map((it) => it.articleId)
        .filter((id) => fresh || !(id in bidsRef.current));
      return fetchBids(ids, fresh);
    },
    [fetchBids],
  );

  const loadMore = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    let nextPage = page;
    try {
      for (let i = 0; i < PAGES_PER_TRIGGER; i++) {
        nextPage += 1;
        const res = await fetch(`/api/navercafe/list?page=${nextPage}`);
        const data = (await res.json()) as MvcAuctionPageResult;
        const fresh = (data.items ?? []).filter((it) => {
          if (seen.current.has(it.articleId)) return false;
          seen.current.add(it.articleId);
          return true;
        });
        if (fresh.length > 0) {
          setItems((prev) => [...prev, ...fresh]);
          loadBids(fresh, false);
        }
        const noMore = !data.hasNext || nextPage >= MAX_PAGE;
        if (noMore) {
          setDone(true);
          break;
        }
        if (fresh.length > 0) break;
      }
    } catch {
      // 다음 트리거에서 재시도
    } finally {
      setPage(nextPage);
      setLoading(false);
      busy.current = false;
    }
  }, [page, done, loadBids]);

  // 새로고침: 새 경매 + 최종호가 갱신. 쿨다운 중엔 무시.
  const refresh = useCallback(async () => {
    if (refreshing || cooldown > 0) return;
    setRefreshing(true);
    try {
      // 1) 새 경매 글 (1페이지) 반영
      try {
        const res = await fetch('/api/navercafe/list?page=1');
        const data = (await res.json()) as MvcAuctionPageResult;
        const fresh = (data.items ?? []).filter((it) => !seen.current.has(it.articleId));
        if (fresh.length > 0) {
          fresh.forEach((it) => seen.current.add(it.articleId));
          setItems((prev) => [...fresh, ...prev]);
        }
      } catch {
        /* noop */
      }
      // 2) 로딩된 모든 글 + 관심목록의 최종호가 fresh 갱신 + 변경 감지
      const before = { ...bidsRef.current };
      const all = [...items];
      const updated = await loadBids(all, true);
      const favIds = favorites
        .map((f) => Number(f.externalId))
        .filter((id) => Number.isInteger(id) && id > 0 && !(id in updated));
      if (favIds.length > 0) Object.assign(updated, await fetchBids(favIds, true));
      const changed = new Set<number>();
      for (const idStr of Object.keys(updated)) {
        const id = Number(idStr);
        const prev = before[id];
        const next = updated[id];
        if ((prev?.content ?? null) !== (next?.content ?? null)) changed.add(id);
      }
      setChangedIds(changed);
      setUpdatedAt(Date.now());
    } finally {
      setRefreshing(false);
      setCooldown(REFRESH_COOLDOWN);
    }
  }, [refreshing, cooldown, items, loadBids, favorites, fetchBids]);

  // 초기 최종호가 로딩
  useEffect(() => {
    loadBids(initial.items, false);
    setUpdatedAt(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 관심목록 항목은 라이브 리스트에 없을 수 있어(오래된 경매) commentCount 필터에 걸려
  // 호가가 갱신되지 않고 추가 당시 스냅샷 가격이 남는다. 관심 항목 id 들은 항상
  // 별도로 fresh 호가를 직접 조회해 리스트에서도 상세와 동일한 최신가를 보이게 한다.
  const favKey = favorites.map((f) => f.externalId).join(',');
  useEffect(() => {
    const ids = favorites
      .map((f) => Number(f.externalId))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length > 0) fetchBids(ids, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favKey, fetchBids]);

  // 쿨다운 카운트다운
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // '갱신' 배지는 6초 후 사라짐
  useEffect(() => {
    if (changedIds.size === 0) return;
    const t = setTimeout(() => setChangedIds(new Set()), 6000);
    return () => clearTimeout(t);
  }, [changedIds]);

  // 무한스크롤
  useEffect(() => {
    if (done) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done]);

  const canRefresh = !refreshing && cooldown === 0;

  return (
    <>
      {/* 새로고침 바 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '0 var(--gap) var(--cg)',
          gap: 10,
        }}
      >
        <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)' }}>
          {updatedAt ? `업데이트 ${fmtClock(updatedAt)}` : ''}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={!canRefresh}
          style={{
            padding: '7px 14px',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            letterSpacing: 0.5,
            background: canRefresh ? 'var(--blu)' : 'var(--ink3)',
            color: 'var(--white)',
            border: 'none',
            cursor: canRefresh ? 'pointer' : 'not-allowed',
            opacity: canRefresh ? 1 : 0.7,
            boxShadow: canRefresh
              ? '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)'
              : 'none',
          }}
        >
          {refreshing ? '갱신 중…' : cooldown > 0 ? `${cooldown}초 후 가능` : '🔄 새로고침'}
        </button>
      </div>

      {(() => {
        const favIds = new Set(favorites.map((f) => f.externalId));
        const liveById = new Map(items.map((it) => [String(it.articleId), it]));
        // 관심목록은 라이브 항목이 있으면 그걸로(최신), 없으면 캐시 메타로 합성.
        const pinned = favorites.map((f) => liveById.get(f.externalId) ?? favToItem(f));
        const rest = items.filter((it) => !favIds.has(String(it.articleId)));

        const renderRow = (item: MvcAuctionItem, pinnedRow: boolean) => {
          const id = String(item.articleId);
          const favMeta = favorites.find((f) => f.externalId === id);
          // fresh 호가를 한 번이라도 받았으면(없음=null 포함) 그걸 신뢰. 아직 못 받았을 때만
          // 관심목록 스냅샷 가격으로 임시 대체.
          const bid =
            item.articleId in bids
              ? bids[item.articleId]
              : favMeta
                ? synthBid(item.articleId, favMeta.price)
                : undefined;
          return (
            <div key={`${pinnedRow ? 'p' : 'r'}-${id}`} style={{ position: 'relative' }}>
              <AuctionRow item={item} bid={bid} changed={changedIds.has(item.articleId)} />
              <FavoriteStar active={isFav(id)} onToggle={() => toggle(favFromItem(item, bids[item.articleId]))} />
            </div>
          );
        };

        return (
          <>
            {pinned.length > 0 && (
              <>
                <div
                  style={{
                    margin: '0 var(--gap) 6px',
                    fontFamily: 'var(--f1)',
                    fontSize: 10,
                    letterSpacing: 0.5,
                    color: 'var(--gold-dk,var(--ink2))',
                  }}
                >
                  ★ 관심목록 {pinned.length}
                </div>
                {pinned.map((it) => renderRow(it, true))}
                <div style={{ height: 8, borderBottom: '2px dashed var(--line)', margin: '0 var(--gap) 10px' }} />
              </>
            )}
            {rest.map((it) => renderRow(it, false))}
          </>
        );
      })()}

      {items.length === 0 && favorites.length === 0 && !loading && (
        <div
          style={{
            margin: '0 var(--gap)',
            padding: '40px 16px',
            textAlign: 'center',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            color: 'var(--ink3)',
          }}
        >
          오늘 마감인 경매가 없습니다.
        </div>
      )}

      {!done && <div ref={sentinelRef} style={{ height: 1 }} />}
      <div
        style={{
          padding: '16px 0 8px',
          textAlign: 'center',
          fontFamily: 'var(--f1)',
          fontSize: 10,
          color: 'var(--ink3)',
          letterSpacing: 0.5,
        }}
      >
        {loading ? '불러오는 중…' : done ? `오늘 마감 경매 ${items.length}건 · 끝` : ''}
      </div>
    </>
  );
}
