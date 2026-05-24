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
            fontSize: 10,
            letterSpacing: 0.3,
            color: 'var(--ink2)',
            maxWidth: 96,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {nick} 님
        </span>
      )}
      <AppBarProfile />
    </div>
  );
}
