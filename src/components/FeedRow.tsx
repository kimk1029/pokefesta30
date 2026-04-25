import { BookmarkButton } from './BookmarkButton';
import { ComposedAvatar } from './ComposedAvatar';
import { CongBadge } from './ui/CongBadge';
import { isAvatarId } from '@/lib/avatars';
import type { FeedPost } from '@/lib/types';

export function FeedRow({ post }: { post: FeedPost }) {
  const isReport = post.kind === 'report';
  const hasPixelAvatar = isAvatarId(post.user);

  return (
    <div className="feed-item">
      <div className="fi-avatar">
        {hasPixelAvatar ? (
          <ComposedAvatar
            avatar={post.user}
            bg={post.authorBgId}
            frame={post.authorFrameId}
            size={56}
          />
        ) : (
          <span style={{ fontSize: 29, lineHeight: 1 }}>{post.user}</span>
        )}
      </div>
      <div className="fi-body">
        <div className="fi-top">
          <span
            className={`tag ${isReport ? 'tag-report' : 'tag-feed'}`}
            style={{ fontSize: 9, padding: '2px 7px' }}
          >
            {isReport ? '📢 제보' : '🗣 일반'}
          </span>
          {post.place && (
            <span className="tag tag-place" style={{ fontSize: 9, padding: '2px 6px' }}>
              📍 {post.place}
            </span>
          )}
          {isReport && post.level && <CongBadge level={post.level} size="small" />}
        </div>
        <div className="fi-text">{post.text}</div>
      </div>
      <div className="fi-right">
        <BookmarkButton feedId={post.id} />
        <span className="fi-time">{post.time}</span>
      </div>
    </div>
  );
}
