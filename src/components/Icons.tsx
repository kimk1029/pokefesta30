import type { ReactNode } from 'react';

export type LineIconName =
  | 'home'
  | 'collection'
  | 'community'
  | 'my'
  | 'plus'
  | 'trade'
  | 'live';

const PATHS: Record<LineIconName, ReactNode> = {
  home: <path d="M3 10l9-7 9 7v10a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V10z" />,
  collection: (
    <>
      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </>
  ),
  community: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  my: (
    <>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  // legacy — 더 이상 메인 탭에서는 안 쓰지만 다른 곳에서 import 할 수 있어 호환 유지
  trade: <path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12" />,
  live: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
};

export function LineIcon({ name }: { name: LineIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon-svg"
    >
      {PATHS[name]}
    </svg>
  );
}
