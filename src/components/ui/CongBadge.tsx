import type { CongestionLevel } from '@/lib/types';

const MAP: Record<CongestionLevel, { cls: string; label: string }> = {
  empty: { cls: 'cb-e', label: '여유' },
  normal: { cls: 'cb-n', label: '보통' },
  busy: { cls: 'cb-b', label: '혼잡' },
  full: { cls: 'cb-f', label: '매우혼잡' },
};

interface Props {
  level: CongestionLevel;
  /** small = compact (cc-badge), full = prominent (tag) */
  size?: 'small' | 'full';
}

export function CongBadge({ level, size = 'full' }: Props) {
  const { cls, label } = MAP[level];
  const base = size === 'small' ? 'cc-badge' : 'tag';
  return <span className={`${base} ${cls}`}>{label}</span>;
}
