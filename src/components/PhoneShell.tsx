'use client';

import { type ReactNode } from 'react';
import { Tabbar } from './Tabbar';

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-wrap">
      <div className="phone">
        <div className="screen">{children}</div>
        <Tabbar />
      </div>
    </div>
  );
}
