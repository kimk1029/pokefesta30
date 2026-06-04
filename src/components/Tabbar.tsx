'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LineIcon, type LineIconName } from './Icons';
import { useTheme } from './ThemeProvider';
import { isFlatTheme } from '@/lib/theme';

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
                {/* 원피스 테마 — 둥근 버튼을 꽉 채우는 탑뷰 밀짚모자. */}
                {theme === 'onepiece' && (
                  <svg
                    className="fab-strawhat"
                    viewBox="0 0 100 100"
                    width="60"
                    height="60"
                    aria-hidden
                  >
                    {/* 브림 — stroke 없음(버튼 보더가 유일한 테두리). 배경 짚색과 이음 */}
                    <circle cx="50" cy="50" r="47" fill="#F4D272" />
                    <circle cx="50" cy="50" r="47" fill="none" stroke="#D8B25A" strokeWidth="2" opacity="0.6" />
                    {/* 짚 짜임 — 바깥 링 짧은 방사 눈금(코너로 삐져나오지 않게 길이 제한) */}
                    <g stroke="rgba(120,80,20,.28)" strokeWidth="1.4">
                      <line x1="50" y1="6" x2="50" y2="15" />
                      <line x1="50" y1="85" x2="50" y2="94" />
                      <line x1="6" y1="50" x2="15" y2="50" />
                      <line x1="85" y1="50" x2="94" y2="50" />
                      <line x1="20" y1="20" x2="26" y2="26" />
                      <line x1="80" y1="20" x2="74" y2="26" />
                      <line x1="20" y1="80" x2="26" y2="74" />
                      <line x1="80" y1="80" x2="74" y2="74" />
                    </g>
                    {/* 짚 짜임 — 동심원 */}
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(120,80,20,.2)" strokeWidth="1.4" />
                    {/* 빨간 밴드 */}
                    <circle cx="50" cy="50" r="34" fill="#E63946" />
                    {/* 크라운(윗면) */}
                    <circle cx="50" cy="50" r="25" fill="#E3B45A" stroke="#C99A4A" strokeWidth="1.5" />
                    {/* 하이라이트 */}
                    <ellipse cx="42" cy="42" rx="8" ry="4.5" fill="#FFF1C9" opacity="0.5" />
                  </svg>
                )}

                {/* 클린 테마 — 화이트 스캔 프레임 아이콘. */}
                {isFlatTheme(theme) && (
                  <svg
                    className="fab-scan"
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M4 9 V7 A3 3 0 0 1 7 4 H9" />
                    <path d="M15 4 H17 A3 3 0 0 1 20 7 V9" />
                    <path d="M20 15 V17 A3 3 0 0 1 17 20 H15" />
                    <path d="M9 20 H7 A3 3 0 0 1 4 17 V15" />
                    <line x1="4" y1="12" x2="20" y2="12" />
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

