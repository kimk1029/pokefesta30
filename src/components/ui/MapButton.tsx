'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'pri' | 'sec';
  children: ReactNode;
}

export function MapButton({ variant = 'sec', className, children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={['map-btn', variant, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
