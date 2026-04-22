'use client';

import type { CongestionLevel } from '@/lib/types';

const SHORT: Record<CongestionLevel, 'e' | 'n' | 'b' | 'f'> = {
  empty: 'e',
  normal: 'n',
  busy: 'b',
  full: 'f',
};

interface Props {
  level: CongestionLevel;
  emoji: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function CongOption({ level, emoji, label, active, onClick }: Props) {
  const cls = ['co', active ? `on ${SHORT[level]}` : ''].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} onClick={onClick}>
      <span className="em">{emoji}</span>
      {label}
    </button>
  );
}
