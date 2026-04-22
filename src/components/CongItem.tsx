import { CongBadge } from './ui/CongBadge';
import type { Place } from '@/lib/types';

export function CongItem({ place }: { place: Place }) {
  return (
    <div className="cc-item">
      <div className="cc-icon" style={{ background: place.bg }}>
        {place.emoji}
      </div>
      <div className="cc-info">
        <div className="cc-name">{place.name}</div>
        <div className="cc-meta">{place.mins <= 1 ? '방금전' : `${place.mins}분전`}</div>
      </div>
      <CongBadge level={place.level} size="small" />
    </div>
  );
}
