'use client';

import type { TradeType } from '@/lib/types';

interface Props {
  variant: TradeType;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function TradeTypeButton({ variant, active, onClick, children }: Props) {
  const cls = ['ttype', variant, active ? 'on' : ''].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
