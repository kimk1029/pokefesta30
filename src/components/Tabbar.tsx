'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LineIcon, type LineIconName } from './Icons';

type TabId = 'home' | 'live' | 'fab' | 'trade' | 'my';

interface Tab {
  id: TabId;
  label: string;
  icon: LineIconName;
  href?: string;
  fab?: boolean;
}

const TABS: Tab[] = [
  { id: 'home', label: '홈', icon: 'home', href: '/' },
  { id: 'live', label: '현황', icon: 'live', href: '/live' },
  { id: 'fab', label: '+', icon: 'plus', fab: true },
  { id: 'trade', label: '거래', icon: 'trade', href: '/trade' },
  { id: 'my', label: '마이', icon: 'my', href: '/my' },
];

function activeId(pathname: string): TabId | '' {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/live')) return 'live';
  if (pathname.startsWith('/trade')) return 'trade';
  if (pathname.startsWith('/my')) return 'my';
  if (pathname.startsWith('/feed')) return 'home';
  if (pathname.startsWith('/map')) return 'home';
  if (pathname.startsWith('/report')) return 'live';
  if (pathname.startsWith('/write/trade')) return 'trade';
  if (pathname.startsWith('/write/feed')) return 'home';
  return '';
}

interface Props {
  onFab: () => void;
}

export function Tabbar({ onFab }: Props) {
  const pathname = usePathname();
  const active = activeId(pathname);

  return (
    <div className="tabbar">
      {TABS.map((t) => {
        const cls = ['tab', active === t.id ? 'on' : '', t.fab ? 'fab-tab' : '']
          .filter(Boolean)
          .join(' ');

        if (t.fab) {
          return (
            <button key={t.id} type="button" className={cls} onClick={onFab} aria-label="작성">
              <div className="fab-circle">
                <LineIcon name={t.icon} />
              </div>
              <span>{t.label}</span>
            </button>
          );
        }

        return (
          <Link key={t.id} href={t.href!} className={cls}>
            <LineIcon name={t.icon} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
