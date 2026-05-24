'use client';

import { useSession } from '@/lib/session';
import { AppBarProfile } from './AppBarProfile';

/** AppBar 오른쪽: '닉네임 님' + 미니 프로필. 홈 상단용. */
export function AppBarUser() {
  const { user, status } = useSession();
  const nick = user?.name?.trim();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
      {status === 'authenticated' && nick && (
        <span
          style={{
            fontFamily: 'var(--f1)',
            letterSpacing: 0.3,
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 2,
            maxWidth: 110,
            minWidth: 0,
          }}
        >
          {/* 닉네임: 2pt 크고 굵게 */}
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 92,
            }}
          >
            {nick}
          </span>
          {/* 님: 원래 크기/굵기 그대로 */}
          <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink2)', flexShrink: 0 }}>님</span>
        </span>
      )}
      <AppBarProfile />
    </div>
  );
}
