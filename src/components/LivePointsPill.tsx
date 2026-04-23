'use client';

import { useInventory } from './InventoryProvider';
import { LivePill } from './ui/LivePill';

/** AppBar 등에서 사용. DB 의 user.points 를 context 로 읽어 실시간 표시. */
export function LivePointsPill() {
  const { points } = useInventory();
  return <LivePill label={`${points.toLocaleString()}P`} />;
}

/** MyScreen 레벨카드의 .point-chip 스타일 버전. */
export function PointChipLive() {
  const { points } = useInventory();
  return <div className="point-chip">🪙 {points.toLocaleString()} 포인트</div>;
}
