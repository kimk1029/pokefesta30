'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ICONS, PixIcon } from './PixIcon';

const TABS = [
  { id: 'home',   href: '/',        label: '홈',   icon: ICONS.home },
  { id: 'live',   href: '/live',    label: '현황', icon: ICONS.live },
  { id: 'report', href: '/report',  label: '제보', icon: ICONS.plus, fab: true },
  { id: 'trade',  href: '/trade',   label: '거래', icon: ICONS.trade },
  { id: 'my',     href: '/my',      label: '마이', icon: ICONS.my },
] as const;

function activeId(pathname: string): string {
  if (pathname === '/')                return 'home';
  if (pathname.startsWith('/live'))    return 'live';
  if (pathname.startsWith('/report'))  return 'report';
  if (pathname.startsWith('/trade'))   return 'trade';
  if (pathname.startsWith('/my'))      return 'my';
  if (pathname.startsWith('/map'))     return 'home'; // 지도는 홈 탭 강조 (원본 phone.jsx tabMap 규칙)
  return '';
}

export function Tabbar() {
  const pathname = usePathname();
  const active = activeId(pathname);
  return (
    <div className="tabbar">
      {TABS.map((t) => {
        const cls = [
          'tab-item',
          active === t.id ? 'active' : '',
          'fab' in t && t.fab ? 'fab' : '',
        ].filter(Boolean).join(' ');
        return (
          <Link key={t.id} href={t.href} className={cls}>
            {'fab' in t && t.fab ? (
              <div className="fab-circle" style={{ color: 'white' }}>
                <PixIcon d={[...t.icon]} size={22} />
              </div>
            ) : (
              <PixIcon d={[...t.icon]} size={18} />
            )}
            <span>{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
