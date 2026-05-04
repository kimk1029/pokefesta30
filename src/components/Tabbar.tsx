'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LineIcon, type LineIconName } from './Icons';

type TabId = 'home' | 'collection' | 'fab' | 'community' | 'my';

interface Tab {
  id: TabId;
  label: string;
  icon?: LineIconName;
  href: string;
  fab?: boolean;
}

const TABS: Tab[] = [
  { id: 'home', label: '홈', icon: 'home', href: '/' },
  { id: 'collection', label: '컬렉션', icon: 'collection', href: '/my/cards' },
  { id: 'fab', label: '추가', href: '/cards/add', fab: true },
  { id: 'community', label: '커뮤니티', icon: 'community', href: '/feed' },
  { id: 'my', label: '프로필', icon: 'my', href: '/my' },
];

function activeId(pathname: string): TabId | '' {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/my/cards')) return 'collection';
  if (pathname.startsWith('/cards/add')) return 'fab';
  if (pathname.startsWith('/cards/grading')) return 'fab';
  if (pathname.startsWith('/feed')) return 'community';
  if (pathname.startsWith('/trade')) return 'community';
  if (pathname.startsWith('/cards')) return 'home';
  if (pathname.startsWith('/my')) return 'my';
  if (pathname.startsWith('/write/feed')) return 'community';
  if (pathname.startsWith('/write/trade')) return 'community';
  return '';
}

export function Tabbar(_props: { onFab?: () => void } = {}) {
  const pathname = usePathname();
  const active = activeId(pathname);
  const [ballAnim, setBallAnim] = useState(false);

  const handleFabClick = () => {
    setBallAnim(false);
    requestAnimationFrame(() => setBallAnim(true));
  };

  return (
    <div className="tabbar">
      {TABS.map((t) => {
        const cls = ['tab', active === t.id ? 'on' : '', t.fab ? 'fab-tab' : '']
          .filter(Boolean)
          .join(' ');

        if (t.fab) {
          return (
            <Link
              key={t.id}
              href={t.href}
              className={cls}
              aria-label="카드 추가"
              onClick={handleFabClick}
            >
              <div
                className={`fab-circle${ballAnim ? ' fab-click' : ''}`}
                onAnimationEnd={() => setBallAnim(false)}
              />
            </Link>
          );
        }

        return (
          <Link key={t.id} href={t.href} className={cls}>
            {t.icon && <LineIcon name={t.icon} />}
            <span>{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

