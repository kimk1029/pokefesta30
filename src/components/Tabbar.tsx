'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LineIcon, type LineIconName } from './Icons';
import { useTheme } from './ThemeProvider';

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
  const { theme } = useTheme();

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
              >
                {/* 원피스 테마에서만 밀짚모자 SVG 렌더 — 다른 테마는 DOM 에 없음. */}
                {theme === 'onepiece' && (
                  <svg
                    className="fab-strawhat"
                    viewBox="0 0 100 100"
                    width="58"
                    height="58"
                    aria-hidden
                  >
                    <ellipse cx="50" cy="52" rx="46" ry="42" fill="#F4D272" stroke="#1A1A2E" strokeWidth="3" />
                    <g stroke="rgba(95,55,15,.32)" strokeWidth="1.2">
                      <line x1="50" y1="14" x2="50" y2="24" />
                      <line x1="50" y1="80" x2="50" y2="90" />
                      <line x1="6" y1="52" x2="16" y2="52" />
                      <line x1="84" y1="52" x2="94" y2="52" />
                      <line x1="20" y1="22" x2="27" y2="29" />
                      <line x1="73" y1="29" x2="80" y2="22" />
                      <line x1="20" y1="82" x2="27" y2="75" />
                      <line x1="73" y1="75" x2="80" y2="82" />
                    </g>
                    <ellipse cx="50" cy="52" rx="34" ry="30" fill="#D9A85D" />
                    <ellipse cx="50" cy="52" rx="28" ry="24" fill="#E63946" stroke="#1A1A2E" strokeWidth="2" />
                    <rect x="44" y="42" width="12" height="3" fill="#FFD23F" />
                    <ellipse cx="50" cy="50" rx="18" ry="16" fill="#B8884B" stroke="#1A1A2E" strokeWidth="2" />
                    <ellipse cx="42" cy="44" rx="6" ry="3" fill="#F4D272" opacity="0.6" />
                    <line x1="4" y1="52" x2="14" y2="56" stroke="#1A1A2E" strokeWidth="2" />
                    <line x1="86" y1="56" x2="96" y2="52" stroke="#1A1A2E" strokeWidth="2" />
                  </svg>
                )}
              </div>
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

