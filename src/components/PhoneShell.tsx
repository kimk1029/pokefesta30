'use client';

import { type ReactNode } from 'react';
import { Tabbar } from './Tabbar';
import { useNavPrefs } from './NavPrefsProvider';

export function PhoneShell({ children }: { children: ReactNode }) {
  const { navStyle } = useNavPrefs();
  // 분리형(플로팅)이면 탭바가 콘텐츠 위에 떠 있으므로(absolute), 마지막 콘텐츠가
  // 바에 가리지 않게 screen 하단 패딩을 더해 그 아래로도 스크롤되게 한다.
  const floating = navStyle === 'floating';
  return (
    <div className="page-wrap">
      <div className={`phone${floating ? ' phone--floatnav' : ''}`}>
        <div className={`screen${floating ? ' screen--floatnav' : ''}`}>{children}</div>
        <Tabbar />
      </div>
    </div>
  );
}
