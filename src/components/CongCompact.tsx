import { CongItem } from './CongItem';
import type { Place } from '@/lib/types';

export function CongCompact({ places }: { places: Place[] }) {
  return (
    <div className="cong-compact">
      {places.map((p) => (
        <CongItem key={p.id} place={p} />
      ))}
    </div>
  );
}
