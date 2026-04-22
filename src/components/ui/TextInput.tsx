'use client';

import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className, ...rest }: Props) {
  return <input className={['text-input', className].filter(Boolean).join(' ')} {...rest} />;
}
