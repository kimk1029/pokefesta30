'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function IconButton({ children, className, type = 'button', ...rest }: Props) {
  return (
    <button type={type} className={['appbar-right', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}
