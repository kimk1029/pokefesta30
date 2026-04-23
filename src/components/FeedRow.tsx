import { BookmarkButton } from './BookmarkButton';
import type { FeedPost } from '@/lib/types';

export function FeedRow({ post }: { post: FeedPost }) {
  return (
    <div className="feed-item">
      <div className="fi-avatar">{post.user}</div>
      <div className="fi-body">
        <div className="fi-top">
          {post.place && (
            <span className="tag tag-place" style={{ fontSize: 10, padding: '2px 6px' }}>
              📍 {post.place}
            </span>
          )}
          <span className="fi-time">{post.time}</span>
        </div>
        <div className="fi-text">{post.text}</div>
      </div>
      <BookmarkButton feedId={post.id} />
    </div>
  );
}
