'use client';

import type { ReactNode } from 'react';

interface Item<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  items: ReadonlyArray<Item<T>>;
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ items, value, onChange }: Props<T>): ReactNode {
  return (
    <div className="seg-wrap">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={`seg ${value === it.id ? 'on' : ''}`}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
