'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/users', label: '회원 관리', icon: '👥' },
  { href: '/feeds', label: '피드 관리', icon: '📝' },
  { href: '/messages', label: '쪽지 목록', icon: '✉️' },
  { href: '/trades', label: '거래 관리', icon: '🤝' },
  { href: '/oripa', label: '오리파 관리', icon: '🎟️' },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="admin-side">
      <div className="admin-brand">
        포케페스타30 Admin
        <small>운영 대시보드</small>
      </div>
      <nav className="admin-nav">
        {NAV.map((n) => {
          const on = n.href === '/' ? pathname === '/' : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={on ? 'on' : ''}>
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
