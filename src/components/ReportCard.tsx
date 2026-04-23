import { PokemonAvatar } from './PokemonAvatar';
import { CongBadge } from './ui/CongBadge';
import { Tag } from './ui/Tag';
import type { FeedItem } from '@/lib/types';

export function ReportCard({ item }: { item: FeedItem }) {
  return (
    <div className="trade-card">
      <div className="trade-tags">
        <Tag variant="report">📢 제보</Tag>
        <Tag variant="place">📍 {item.place}</Tag>
        <CongBadge level={item.level} size="small" />
      </div>
      <div className="trade-title">{item.text}</div>
      <div className="trade-meta">
        <span>{item.time}</span>
        <span>·</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            verticalAlign: 'middle',
          }}
        >
          <PokemonAvatar id={item.user} size={18} fallback={item.user} />
        </span>
      </div>
    </div>
  );
}
