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
  { id: 'fab', label: '스캔', href: '/cards/grading', fab: true },
  { id: 'community', label: '커뮤니티', icon: 'community', href: '/feed' },
  { id: 'my', label: '프로필', icon: 'my', href: '/my' },
];

function activeId(pathname: string): TabId | '' {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/my/cards')) return 'collection';
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
              aria-label="카드 스캔"
              onClick={handleFabClick}
            >
              <div
                className={`fab-circle${ballAnim ? ' fab-click' : ''}`}
                onAnimationEnd={() => setBallAnim(false)}
              >
                <PokeballIcon />
              </div>
              <span>{t.label}</span>
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

/** 픽셀 포켓볼 — CardVault 디자인 그대로. */
function PokeballIcon() {
  return (
    <svg
      width="54"
      height="54"
      viewBox="0 0 10 10"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-hidden
    >
      <rect x="2" y="0" width="6" height="1" fill="#1A1A2E" />
      <rect x="1" y="1" width="1" height="1" fill="#1A1A2E" />
      <rect x="8" y="1" width="1" height="1" fill="#1A1A2E" />
      <rect x="0" y="2" width="1" height="6" fill="#1A1A2E" />
      <rect x="9" y="2" width="1" height="6" fill="#1A1A2E" />
      <rect x="1" y="8" width="1" height="1" fill="#1A1A2E" />
      <rect x="8" y="8" width="1" height="1" fill="#1A1A2E" />
      <rect x="2" y="9" width="6" height="1" fill="#1A1A2E" />
      <rect x="2" y="1" width="6" height="1" fill="#E63946" />
      <rect x="1" y="2" width="8" height="2" fill="#E63946" />
      <rect x="1" y="4" width="8" height="1" fill="#1A1A2E" />
      <rect x="1" y="5" width="8" height="2" fill="#FFFFFF" />
      <rect x="1" y="7" width="8" height="1" fill="#FFFFFF" />
      <rect x="2" y="8" width="6" height="1" fill="#FFFFFF" />
      <rect x="4" y="3" width="2" height="4" fill="#1A1A2E" />
      <rect x="3" y="4" width="4" height="2" fill="#1A1A2E" />
      <rect x="4" y="4" width="2" height="2" fill="#FFFFFF" />
      <rect x="2" y="1" width="2" height="1" fill="#FF6470" />
      <rect x="1" y="2" width="2" height="1" fill="#FF6470" />
    </svg>
  );
}
