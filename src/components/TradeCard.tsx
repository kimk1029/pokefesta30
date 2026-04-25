import Link from 'next/link';
import { BookmarkButton } from './BookmarkButton';
import { ComposedAvatar } from './ComposedAvatar';
import { Tag } from './ui/Tag';
import { formatPrice } from '@/lib/numberFormat';
import type { Trade } from '@/lib/types';

interface Props {
  trade: Trade;
  /** 1:1 채팅 시도자 수 표시 (목록 화면에서만) */
  showChatCount?: boolean;
}

export function TradeCard({ trade, showChatCount }: Props) {
  const done = trade.status === 'done';
  const hasImages = trade.images && trade.images.length > 0;
  const chatCount = trade.chatCount ?? 0;

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
        {/* 좌: 작성자 아바타 + 닉네임 (세로 정렬) */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            width: 50,
          }}
        >
          <ComposedAvatar
            avatar={trade.authorEmoji}
            bg={trade.authorBgId}
            frame={trade.authorFrameId}
            size={40}
            fallback={trade.authorName ?? '🐣'}
          />
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 7,
              color: 'var(--ink2)',
              letterSpacing: 0.2,
              maxWidth: 50,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
            title={trade.authorName ?? '-'}
          >
            {trade.authorName ?? '-'}
          </div>
        </div>

        {/* 중앙: 태그 + 제목 + 메타 (시간 제외, 가격/채팅수만) */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minHeight: 60,
          }}
        >
          <div className="trade-tags">
            <Tag variant={trade.type === 'buy' ? 'buy' : 'sell'}>
              {trade.type === 'buy' ? '삽니다' : '팝니다'}
            </Tag>
            <Tag variant="place">📍 {trade.place}</Tag>
            {done && <Tag variant="place">✅ 완료</Tag>}
            {hasImages && <Tag variant="place">📷 {trade.images!.length}</Tag>}
          </div>
          <div
            className="trade-title"
            style={done ? { textDecoration: 'line-through' } : {}}
          >
            {trade.title}
          </div>
          <div
            className="trade-meta"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <span className="t-price">{formatPrice(trade.price)}</span>
            {showChatCount && chatCount > 0 && (
              <span title="1:1 채팅 시도한 사람 수">💬 {chatCount}명</span>
            )}
          </div>
        </div>

        {/* 우: 썸네일 + 북마크 + 우측 하단 시간 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 6,
            minHeight: 70,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasImages && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trade.images![0]}
                alt=""
                width={48}
                height={48}
                style={{
                  width: 48,
                  height: 48,
                  objectFit: 'cover',
                  background: 'var(--pap2)',
                  boxShadow:
                    '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
                }}
              />
            )}
            <BookmarkButton tradeId={trade.id} />
          </div>
          <span
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 8,
              color: 'var(--ink3)',
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
            }}
          >
            {trade.time}
          </span>
        </div>
      </div>
    </Link>
  );
}
