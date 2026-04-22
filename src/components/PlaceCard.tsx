import { CongBadge } from './ui/CongBadge';
import type { Place } from '@/lib/types';

export function PlaceCard({ place }: { place: Place }) {
  const freshCls = place.mins <= 5 ? 'fresh' : place.mins > 15 ? 'stale' : '';
  return (
    <div className="place-card">
      <div className="p-icon" style={{ background: place.bg }}>
        {place.emoji}
      </div>
      <div className="p-main">
        <div className="p-name">
          {place.name}
          {place.mins <= 5 && <span className="new-tag">새로움</span>}
        </div>
        <div className="p-meta">
          <span className={freshCls}>
            {place.mins <= 1 ? '방금 전' : `${place.mins}분 전`}
          </span>
          {' · '}제보 {place.count}
          {place.mins > 15 && <span className="stale"> · 신뢰도 낮음</span>}
        </div>
      </div>
      <CongBadge level={place.level} />
    </div>
  );
}
