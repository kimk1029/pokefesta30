import type { CongestionLevel } from '@/lib/types';

const MAP: Record<CongestionLevel, { cls: string; label: string }> = {
  empty:  { cls: 'cb-empty',  label: '여유' },
  normal: { cls: 'cb-normal', label: '보통' },
  busy:   { cls: 'cb-busy',   label: '혼잡' },
  full:   { cls: 'cb-full',   label: '매우혼잡' },
};

export function CongBadge({ level }: { level: CongestionLevel }) {
  const m = MAP[level];
  return <span className={`congestion-badge ${m.cls}`}>{m.label}</span>;
}
