'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ComposedAvatar } from '@/components/ComposedAvatar';
import { useInventory } from '@/components/InventoryProvider';
import { useToast } from '@/components/ToastProvider';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';

interface Msg {
  id: number;
  senderId: string;
  receiverId: string;
  text: string;
  tradeId: number | null;
  readAt: string | null;
  createdAt: string;
}

interface PeerProfile {
  id: string;
  name: string;
  avatarId: string;
  backgroundId: string;
  frameId: string;
}

interface Props {
  peerId: string;
  peer?: PeerProfile;
  myId: string;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function MessagesThreadScreen({ peerId, peer, myId }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const tradeId = sp.get('trade');
  const toast = useToast();
  const inv = useInventory();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch(`/api/messages/${peerId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { data: Msg[] }) => setMsgs(data.data ?? []))
      .catch(() => setMsgs([]));
  }, [peerId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const body: Record<string, unknown> = { receiverId: peerId, text };
      if (tradeId) body.tradeId = Number(tradeId);
      const r = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? '전송 실패');
      }
      const data = await r.json();
      setMsgs((m) => [
        ...m,
        {
          id: data.data.id,
          senderId: myId,
          receiverId: peerId,
          text,
          tradeId: tradeId ? Number(tradeId) : null,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      setInput('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '전송 실패');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <StatusBar />
      <AppBar
        title={peer?.name ?? '쪽지'}
        showBack
        backHref="/my/messages"
        right={
          tradeId ? (
            <button
              type="button"
              onClick={() => router.push(`/trade/${tradeId}`)}
              className="appbar-right"
              aria-label="거래글 보기"
              style={{ background: 'var(--yel)' }}
            >
              🔗
            </button>
          ) : undefined
        }
      />

      {tradeId && (
        <div
          style={{
            margin: '14px var(--gap) 0',
            padding: '8px 12px',
            background: 'var(--pap2)',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--ink2)',
            letterSpacing: 0.3,
            textAlign: 'center',
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
          }}
        >
          🔗 거래글 #{tradeId} 에 대한 쪽지
        </div>
      )}

      <div ref={listRef} className="chat-list">
        {msgs.length === 0 ? (
          <div className="chat-sys">— 주고받은 쪽지가 없어요 —</div>
        ) : (
          msgs.map((m) => {
            const mine = m.senderId === myId;
            return (
              <div key={m.id} className={`chat-row ${mine ? 'mine' : 'peer'}`}>
                {!mine && peer && (
                  <div className="chat-avatar">
                    <ComposedAvatar
                      avatar={peer.avatarId}
                      bg={peer.backgroundId}
                      frame={peer.frameId}
                      size={32}
                      fallback={peer.name}
                    />
                  </div>
                )}
                <div className="chat-bubble-wrap">
                  <div className={`chat-bubble ${mine ? 'mine' : 'peer'}`}>{m.text}</div>
                  <span className="chat-time">{fmtTime(m.createdAt)}</span>
                </div>
                {mine && (
                  <div className="chat-avatar">
                    <ComposedAvatar
                      avatar={inv.avatar}
                      bg={inv.bg}
                      frame={inv.frame}
                      size={32}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="chat-input-wrap">
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send();
            }
          }}
          placeholder="쪽지 입력..."
          maxLength={500}
        />
        <button
          type="button"
          className="chat-send"
          onClick={send}
          disabled={sending || !input.trim()}
          aria-label="보내기"
        >
          ▶
        </button>
      </div>
    </>
  );
}
