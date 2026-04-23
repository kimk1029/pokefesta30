'use client';

import { signOut } from 'next-auth/react';

export function LogoutButton() {
  return (
    <button
      type="button"
      className="my-item"
      style={{ width: '100%', cursor: 'pointer' }}
      onClick={() => signOut({ callbackUrl: '/' })}
    >
      <div className="mi-icon" style={{ background: 'var(--ink3)' }}>
        ↩
      </div>
      <div className="mi-main">로그아웃</div>
      <span className="mi-arr">▶</span>
    </button>
  );
}
