import Link from 'next/link';
import { BookmarkButton } from './BookmarkButton';
import { Tag } from './ui/Tag';
import type { Trade } from '@/lib/types';

interface Props {
  trade: Trade;
  showComments?: boolean;
}

export function TradeCard({ trade, showComments }: Props) {
  return (
    <Link href={`/trade/${trade.id}`} className="trade-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="trade-tags">
            <Tag variant={trade.type === 'buy' ? 'buy' : 'sell'}>
              {trade.type === 'buy' ? '삽니다' : '팝니다'}
            </Tag>
            <Tag variant="place">📍 {trade.place}</Tag>
          </div>
          <div className="trade-title">{trade.title}</div>
          <div className="trade-meta">
            <span>{trade.time}</span>
            <span>·</span>
            <span className="t-price">{trade.price}</span>
            {showComments && (
              <>
                <span>·</span>
                <span>💬 3</span>
              </>
            )}
          </div>
        </div>
        <BookmarkButton tradeId={trade.id} />
      </div>
    </Link>
  );
}
