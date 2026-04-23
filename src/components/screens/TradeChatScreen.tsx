'use client';

import { useEffect, useRef, useState } from 'react';
import { ComposedAvatar } from '@/components/ComposedAvatar';
import { useInventory } from '@/components/InventoryProvider';
import { useToast } from '@/components/ToastProvider';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { Tag } from '@/components/ui/Tag';
import type { TradeDetail } from '@/lib/types';

type Sender = 'me' | 'peer' | 'system';

interface Msg {
  id: number;
  sender: Sender;
  text: string;
  time: string;
}

function nowStr(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

const PRESETS = [
  '정가 거래 가능한가요?',
  '지금 구매 가능한가요?',
  '직거래 장소 어디인가요?',
  '교환 가능한가요?',
];

export function TradeChatScreen({ trade }: { trade: TradeDetail }) {
  const toast = useToast();
  const inv = useInventory();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 1,
      sender: 'system',
      text: `${trade.title} 에 대한 1:1 문의 채팅방이 열렸어요`,
      time: nowStr(),
    },
    {
      id: 2,
      sender: 'peer',
      text: '안녕하세요! 문의 남겨주세요.',
      time: nowStr(),
    },
  ]);
  const [input, setInput] = useState('');
  const [seq, setSeq] = useState(3);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs.length]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const nextId = seq;
    setSeq((s) => s + 2);
    setMsgs((m) => [...m, { id: nextId, sender: 'me', text: t, time: nowStr() }]);
    setInput('');
    // mock peer typing → reply (웹소켓 연결 전 UI 확인용 데모)
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          id: nextId + 1,
          sender: 'peer',
          text: '🤖 (데모) 판매자 응답은 웹소켓 연결 후 실시간으로 도착해요',
          time: nowStr(),
        },
      ]);
    }, 1200);
  };

  return (
    <>
      <StatusBar />
      <AppBar title="1:1 문의" showBack backHref={`/trade/${trade.id}`} />

      {/* 거래글 요약 */}
      <div
        style={{
          margin: 'var(--gap) var(--gap) 0',
          padding: '10px 12px',
          background: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.85),inset 0 -2px 0 rgba(0,0,0,.1),4px 4px 0 var(--ink)',
        }}
      >
        <ComposedAvatar
          avatar={trade.authorEmoji}
          bg={trade.authorBgId}
          frame={trade.authorFrameId}
          size={44}
          fallback={trade.authorEmoji}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              marginBottom: 4,
              flexWrap: 'wrap',
            }}
          >
            <Tag variant={trade.type === 'buy' ? 'buy' : 'sell'}>
              {trade.type === 'buy' ? '삽니다' : '팝니다'}
            </Tag>
            <Tag variant="place">📍 {trade.place}</Tag>
          </div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 10, letterSpacing: 0.3, lineHeight: 1.5 }}>
            {trade.title}
          </div>
        </div>
        <span style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--red)' }}>
          {trade.price}
        </span>
      </div>

      {/* 안내 배너 */}
      <div
        style={{
          margin: '10px var(--gap) 0',
          padding: '8px 10px',
          background: 'var(--yel)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink)',
          letterSpacing: 0.3,
          lineHeight: 1.6,
          textAlign: 'center',
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
        }}
      >
        🚧 채팅 UI 데모 · 웹소켓 연결 전이라 메시지는 이 세션에만 유지됩니다
      </div>

      {/* 메시지 목록 */}
      <div ref={listRef} className="chat-list">
        {msgs.map((m) => {
          if (m.sender === 'system') {
            return (
              <div key={m.id} className="chat-sys">
                — {m.text} —
              </div>
            );
          }
          const mine = m.sender === 'me';
          return (
            <div key={m.id} className={`chat-row ${mine ? 'mine' : 'peer'}`}>
              {!mine && (
                <div className="chat-avatar">
                  <ComposedAvatar
                    avatar={trade.authorEmoji}
                    bg={trade.authorBgId}
                    frame={trade.authorFrameId}
                    size={32}
                    fallback={trade.authorEmoji}
                  />
                </div>
              )}
              <div className="chat-bubble-wrap">
                <div className={`chat-bubble ${mine ? 'mine' : 'peer'}`}>{m.text}</div>
                <span className="chat-time">{m.time}</span>
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
        })}
      </div>

      {/* 빠른 문구 */}
      <div className="chat-presets">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className="chat-preset"
            onClick={() => send(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 입력창 */}
      <div className="chat-input-wrap">
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="메시지 입력..."
          maxLength={200}
        />
        <button
          type="button"
          className="chat-send"
          onClick={() => send(input)}
          disabled={!input.trim()}
          aria-label="보내기"
        >
          ▶
        </button>
      </div>

      <button
        type="button"
        onClick={() => toast.info('신고가 접수되었습니다 (데모)')}
        style={{
          margin: '10px var(--gap) 14px',
          padding: '6px 10px',
          background: 'transparent',
          border: 'none',
          fontFamily: 'var(--f1)',
          fontSize: 8,
          color: 'var(--ink3)',
          letterSpacing: 0.3,
          textDecoration: 'underline',
          cursor: 'pointer',
          display: 'block',
          textAlign: 'center',
          width: 'calc(100% - var(--gap) * 2)',
        }}
      >
        🚩 불법/스팸 신고
      </button>
    </>
  );
}
