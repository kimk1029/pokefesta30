'use client';

import { useState, type ReactNode } from 'react';
import { FabMenu } from './FabMenu';
import { Tabbar } from './Tabbar';

export function PhoneShell({ children }: { children: ReactNode }) {
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div className="page-wrap">
      <div className="phone">
        <div className="screen">{children}</div>
        {fabOpen && <FabMenu onClose={() => setFabOpen(false)} />}
        <Tabbar onFab={() => setFabOpen((v) => !v)} />
      </div>
    </div>
  );
}
