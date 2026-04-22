'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function FabButton({ children, className, type = 'button', ...rest }: Props) {
  return (
    <button type={type} className={['fab-btn', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}
