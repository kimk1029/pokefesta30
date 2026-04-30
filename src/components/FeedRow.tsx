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
  const images = post.images ?? [];
  const hasImages = images.length > 0;

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
        {/* 사진은 상세 펼쳤을 때만 노출 */}
        {expanded && hasImages && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(images.length, 3)}, 1fr)`,
              gap: 6,
              marginTop: 8,
            }}
          >
            {images.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', aspectRatio: '1/1', overflow: 'hidden' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`피드 사진 ${i + 1}`}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    background: 'var(--pap2)',
                    boxShadow:
                      '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
                  }}
                />
              </a>
            ))}
          </div>
        )}
        {expanded && (
          <div className="fi-meta">
            <span className="fi-meta-time">🕒 {formatAbsolute(post.createdAt)}</span>
          </div>
        )}
      </div>
      <div className="fi-right" onClick={(e) => e.stopPropagation()}>
        <BookmarkButton feedId={post.id} />
        {/* 사진 인디케이터 — 좋아요 아래, 아이콘 + 갯수(오른쪽) */}
        {hasImages && (
          <div
            aria-label={`사진 ${images.length}장`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 4px',
              fontFamily: 'var(--f1)',
              color: 'var(--ink2)',
              letterSpacing: 0.3,
              lineHeight: 1,
            }}
          >
            <span style={{ fontSize: 16 }}>📷</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink)' }}>
              {images.length}
            </span>
          </div>
        )}
        <span className="fi-time">{post.time}</span>
      </div>
    </div>
  );
}
