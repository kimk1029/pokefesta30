import type { FeedItem } from '@/lib/types';

export function FeedRow({ item }: { item: FeedItem }) {
  return (
    <div className="feed-item">
      <div className="fi-avatar">{item.user}</div>
      <div className="fi-body">
        <div className="fi-top">
          <span className="tag tag-place" style={{ fontSize: 7, padding: '2px 6px' }}>
            📍 {item.place}
          </span>
          <span className="fi-time">{item.time}</span>
        </div>
        <div className="fi-text">{item.text}</div>
      </div>
    </div>
  );
}
