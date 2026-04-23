import { BookmarkButton } from './BookmarkButton';
import { PokemonAvatar } from './PokemonAvatar';
import { CongBadge } from './ui/CongBadge';
import type { FeedPost } from '@/lib/types';

export function FeedRow({ post }: { post: FeedPost }) {
  const isReport = post.kind === 'report';
  return (
    <div className="feed-item">
      <div className="fi-avatar">
        <PokemonAvatar id={post.user} size={28} fallback={post.user} />
      </div>
      <div className="fi-body">
        <div className="fi-top">
          <span
            className={`tag ${isReport ? 'tag-report' : 'tag-feed'}`}
            style={{ fontSize: 10, padding: '2px 7px' }}
          >
            {isReport ? '📢 제보' : '🗣 일반'}
          </span>
          {post.place && (
            <span className="tag tag-place" style={{ fontSize: 10, padding: '2px 6px' }}>
              📍 {post.place}
            </span>
          )}
          {isReport && post.level && <CongBadge level={post.level} size="small" />}
          <span className="fi-time">{post.time}</span>
        </div>
        <div className="fi-text">{post.text}</div>
      </div>
      <BookmarkButton feedId={post.id} />
    </div>
  );
}
