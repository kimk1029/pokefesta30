'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  mvcImgProxy,
  stripDeadlinePrefix,
  type MvcAuctionItem,
  type MvcLatestBid,
} from '@/lib/navercafe';
import type { Palette } from '@/components/dashboard/CleanHome';

/**
 * 홈 화면 '실시간 MVC 경매' 섹션 — 오늘 마감 경매 상위 몇 건을 보여주고,
 * 최종호가(입찰 댓글)를 클라이언트에서 주기적으로 새로고침해 실시간처럼 갱신한다.
 * 전체 목록/무한스크롤은 /cards/mvc-auction 페이지(MvcAuctionList) 담당.
 */

const BID_CHUNK = 25; // 최종호가 배치 조회 단위
const REFRESH_MS = 30_000; // 최종호가 자동 갱신 주기
const MAX_SHOWN = 5; // 홈 미리보기 노출 건수

type BidMap = Record<number, MvcLatestBid | null>;

function fmtWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

interface Props {
  initial: MvcAuctionItem[];
  P: Palette;
}

export function HomeMvcAuctions({ initial, P }: Props) {
  const items = initial.slice(0, MAX_SHOWN);
  const [bids, setBids] = useState<BidMap>({});
  const [changed, setChanged] = useState<Set<number>>(new Set());
  const bidsRef = useRef<BidMap>({});

  useEffect(() => {
    if (items.length === 0) return;
    let alive = true;
    const ids = items.filter((it) => it.commentCount > 0).map((it) => it.articleId);
    if (ids.length === 0) return;

    const load = async () => {
      const collected: BidMap = {};
      for (let i = 0; i < ids.length; i += BID_CHUNK) {
        const chunk = ids.slice(i, i + BID_CHUNK);
        try {
          const res = await fetch(`/api/navercafe/latest-bids?ids=${chunk.join(',')}&fresh=1`);
          const data = (await res.json()) as { bids: BidMap };
          Object.assign(collected, data.bids ?? {});
        } catch {
          // 무시 — 다음 주기에 재시도
        }
      }
      if (!alive) return;
      // 직전 호가와 다른 항목은 '갱신' 배지로 잠깐 표시.
      const before = bidsRef.current;
      const diff = new Set<number>();
      for (const idStr of Object.keys(collected)) {
        const id = Number(idStr);
        if ((before[id]?.content ?? null) !== (collected[id]?.content ?? null)) diff.add(id);
      }
      bidsRef.current = collected;
      setBids(collected);
      // 첫 로딩(before 비어있음)은 배지를 띄우지 않음.
      if (Object.keys(before).length > 0 && diff.size > 0) {
        setChanged(diff);
        setTimeout(() => alive && setChanged(new Set()), 6000);
      }
    };

    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{ padding: '0 20px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 18, fontWeight: 800, color: P.ink }}>
          <span style={{ fontSize: 18 }}>🔨</span>
          실시간 MVC 경매
        </div>
        <Link
          href="/cards/mvc-auction"
          style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: P.ink3, textDecoration: 'none' }}
        >
          더보기
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.ink3} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      </div>

      {items.map((it) => {
        const bid = bids[it.articleId];
        const has = it.commentCount > 0;
        const label =
          bid == null
            ? has
              ? '…'
              : '입찰 없음'
            : bid.content
              ? bid.content
              : bid.amount != null
                ? fmtWon(bid.amount)
                : '입찰';
        return (
          <Link
            key={it.articleId}
            href={`/cards/mvc-auction/${it.articleId}`}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${P.line}`, textDecoration: 'none', color: 'inherit' }}
          >
            <AuctionThumb url={it.thumbnailUrl} P={P} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5, fontWeight: 700, color: P.ink, lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
              >
                {stripDeadlinePrefix(it.subject)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
                <span
                  style={{
                    fontSize: 13.5, fontWeight: 800, letterSpacing: '-.3px',
                    color: has ? P.rise : P.ink3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {label}
                </span>
                {changed.has(it.articleId) && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: P.regIcon, padding: '1px 5px', borderRadius: 4, flex: 'none' }}>
                    갱신
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: P.ink3, flex: 'none', whiteSpace: 'nowrap' }}>🔨 {it.commentCount}</div>
          </Link>
        );
      })}
    </div>
  );
}

function AuctionThumb({ url, P }: { url: string | null; P: Palette }) {
  const [err, setErr] = useState(false);
  const ok = Boolean(url) && !err;
  return (
    <div
      style={{
        width: 52, height: 52, borderRadius: 9, overflow: 'hidden', flex: 'none',
        background: P.tileBg, display: 'grid', placeItems: 'center',
      }}
    >
      {ok ? (
        // 외부(네이버 카페) 이미지 — 우리 도메인 referer는 403 차단되어 서버 프록시 경유.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mvcImgProxy(url!)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{ fontSize: 22 }}>🔨</span>
      )}
    </div>
  );
}
