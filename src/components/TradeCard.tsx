import { Tag } from './ui/Tag';
import type { Trade } from '@/lib/types';

interface Props {
  trade: Trade;
  showComments?: boolean;
}

export function TradeCard({ trade, showComments }: Props) {
  return (
    <div className="trade-card">
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
  );
}
