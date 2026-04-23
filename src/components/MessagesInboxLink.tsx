'use client';

import Link from 'next/link';
import { useUnread } from './UnreadProvider';

/** MyScreen 의 내 활동 섹션에서 쓰는 쪽지함 링크 (unread 배지 포함). */
export function MessagesInboxLink() {
  const { count } = useUnread();
  return (
    <Link href="/my/messages" className="my-item" style={{ position: 'relative' }}>
      <div className="mi-icon" style={{ background: '#0D7377', color: '#fff' }}>
        ✉
      </div>
      <div className="mi-main">
        쪽지함
        {count > 0 && (
          <span
            style={{
              marginLeft: 8,
              padding: '2px 7px',
              background: 'var(--red)',
              color: 'var(--white)',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              letterSpacing: 0.3,
              boxShadow:
                '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
            }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
      <span className="mi-arr">▶</span>
    </Link>
  );
}
