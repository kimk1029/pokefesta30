'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function PrimaryButton({ children, className, type = 'button', ...rest }: Props) {
  return (
    <button type={type} className={['pri-btn', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  );
}
