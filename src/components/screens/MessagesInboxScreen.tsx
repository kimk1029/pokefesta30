'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ComposedAvatar } from '@/components/ComposedAvatar';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import type { Thread } from '@/lib/messages';

function relTime(iso: string | Date): string {
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (mins <= 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

export function MessagesInboxScreen() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/messages', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { data: Thread[] }) => setThreads(data.data ?? []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <StatusBar />
      <AppBar title="쪽지함" showBack backHref="/my" />

      <div style={{ height: 14 }} />

      {loading && threads.length === 0 ? (
        <div
          style={{
            margin: '30px auto',
            textAlign: 'center',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink3)',
          }}
        >
          불러오는 중...
        </div>
      ) : threads.length === 0 ? (
        <div
          style={{
            margin: '30px var(--gap)',
            padding: '24px 12px',
            background: 'var(--white)',
            textAlign: 'center',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            color: 'var(--ink2)',
            lineHeight: 1.8,
            letterSpacing: 0.3,
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),4px 4px 0 var(--ink)',
          }}
        >
          📭 주고받은 쪽지가 없어요
          <br />
          <span style={{ fontSize: 9, color: 'var(--ink3)' }}>
            거래글에서 "1:1 쪽지 보내기" 로 시작해보세요
          </span>
        </div>
      ) : (
        <div className="sect">
          {threads.map((t) => (
            <Link
              key={t.peerId}
              href={`/my/messages/${t.peerId}`}
              className="thread-item"
            >
              <div className="thread-avatar">
                <ComposedAvatar
                  avatar={t.peerAvatar}
                  bg={t.peerBgId}
                  frame={t.peerFrameId}
                  size={44}
                  fallback={t.peerName}
                />
              </div>
              <div className="thread-main">
                <div className="thread-top">
                  <span className="thread-name">{t.peerName}</span>
                  <span className="thread-time">{relTime(t.lastAt)}</span>
                </div>
                <div className="thread-last">
                  {t.lastFromMe && <span className="thread-me">나:</span>}
                  {t.lastText}
                </div>
              </div>
              {t.unread > 0 && (
                <span className="thread-unread">
                  {t.unread > 99 ? '99+' : t.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="bggap" />
    </>
  );
}
