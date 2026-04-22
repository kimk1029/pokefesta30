import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { CongBadge } from '@/components/CongBadge';
import { StatusBar } from '@/components/StatusBar';
import type { FeedItem, Place } from '@/lib/types';

interface Props {
  places: Place[];
  feed: FeedItem[];
}

export function LiveScreen({ places, feed }: Props) {
  return (
    <>
      <StatusBar />
      <AppHeader />
      <div className="screen-title-bar">
        <div>
          <h1>실시간 현황</h1>
          <div className="sub">사용자 제보 · 방금 업데이트</div>
        </div>
        <span className="live-dot">실시간</span>
      </div>

      <div className="section">
        <div className="section-title">
          <h2>장소별 · {places.length}곳</h2>
        </div>
        {places.map((p) => (
          <div key={p.id} className="place-card">
            <div className="place-icon" style={{ background: p.bg }}>{p.emoji}</div>
            <div className="place-main">
              <div className="place-name">
                {p.name}
                {p.mins <= 5 && <span className="new-pill">새로움</span>}
              </div>
              <div className="place-meta">
                <span className={p.mins <= 5 ? 'fresh' : p.mins > 15 ? 'stale' : ''}>
                  {p.mins <= 1 ? '방금 전' : `${p.mins}분 전`}
                </span>
                {' · '}제보 {p.count}
                {p.mins > 15 && <span className="stale"> · 신뢰도 낮음</span>}
              </div>
            </div>
            <CongBadge level={p.level} />
          </div>
        ))}
      </div>

      <div className="section">
        <div className="section-title">
          <h2>최근 제보</h2>
        </div>
        {feed.length === 0 ? (
          <div className="feed-item"><div className="feed-body"><div className="feed-text">아직 제보가 없어요. 첫 번째가 되어보세요!</div></div></div>
        ) : feed.map((f) => (
          <div key={f.id} className="feed-item">
            <div className="feed-avatar">{f.user}</div>
            <div className="feed-body">
              <div className="feed-top">
                <span className={`dot-s ${f.level}`} />
                <span className="feed-place">{f.place}</span>
                <span className="feed-time">{f.time}</span>
              </div>
              <div className="feed-text">{f.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 90 }} />

      <Link href="/report" className="fab-floating">
        + 제보하기
      </Link>
    </>
  );
}
