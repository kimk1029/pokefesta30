import Link from 'next/link';
import { BookmarkButton } from './BookmarkButton';
import { ComposedAvatar } from './ComposedAvatar';
import { Tag } from './ui/Tag';
import { formatPrice } from '@/lib/numberFormat';
import type { Trade } from '@/lib/types';

interface Props {
  trade: Trade;
  showComments?: boolean;
}

export function TradeCard({ trade, showComments }: Props) {
  const done = trade.status === 'done';
  const hasImages = trade.images && trade.images.length > 0;

  return (
    <Link
      href={`/trade/${trade.id}`}
      className="trade-card"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        opacity: done ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* 작성자 아바타 */}
        <div style={{ flexShrink: 0 }}>
          <ComposedAvatar
            avatar={trade.authorEmoji}
            bg={trade.authorBgId}
            frame={trade.authorFrameId}
            size={40}
            fallback={trade.authorName ?? '🐣'}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="trade-tags">
            <Tag variant={trade.type === 'buy' ? 'buy' : 'sell'}>
              {trade.type === 'buy' ? '삽니다' : '팝니다'}
            </Tag>
            <Tag variant="place">📍 {trade.place}</Tag>
            {done && <Tag variant="place">✅ 완료</Tag>}
            {hasImages && <Tag variant="place">📷 {trade.images!.length}</Tag>}
          </div>
          <div className="trade-title" style={done ? { textDecoration: 'line-through' } : {}}>
            {trade.title}
          </div>
          <div className="trade-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--ink2)', fontWeight: 500 }}>
              {trade.authorName ?? '-'}
            </span>
            <span>·</span>
            <span>{trade.time}</span>
            <span>·</span>
            <span className="t-price">{formatPrice(trade.price)}</span>
            {showComments && (
              <>
                <span>·</span>
                <span>💬 3</span>
              </>
            )}
          </div>
        </div>

        {/* 대표 썸네일 (첫 이미지만) */}
        {hasImages && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trade.images![0]}
            alt=""
            width={56}
            height={56}
            style={{
              width: 56,
              height: 56,
              objectFit: 'cover',
              flexShrink: 0,
              background: 'var(--pap2)',
              boxShadow:
                '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
            }}
          />
        )}

        <BookmarkButton tradeId={trade.id} />
      </div>
    </Link>
  );
}
