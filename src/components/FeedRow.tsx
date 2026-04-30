'use client';

import { useState } from 'react';
import { BookmarkButton } from './BookmarkButton';
import { ComposedAvatar } from './ComposedAvatar';
import { CongBadge } from './ui/CongBadge';
import { isAvatarId } from '@/lib/avatars';
import type { FeedPost } from '@/lib/types';

function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

export function FeedRow({ post }: { post: FeedPost }) {
  const isReport = post.kind === 'report';
  const hasPixelAvatar = isAvatarId(post.user);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`feed-item${expanded ? ' feed-item--expanded' : ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
    >
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
        {expanded && (
          <div className="fi-meta">
            <span className="fi-meta-time">🕒 {formatAbsolute(post.createdAt)}</span>
          </div>
        )}
      </div>
      <div className="fi-right" onClick={(e) => e.stopPropagation()}>
        <BookmarkButton feedId={post.id} />
        <span className="fi-time">{post.time}</span>
      </div>
    </div>
  );
}
