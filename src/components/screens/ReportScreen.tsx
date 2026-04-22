'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitReport } from '@/app/actions';
import { StatusBar } from '@/components/StatusBar';
import type { CongestionLevel, Place } from '@/lib/types';

const LEVELS: { id: CongestionLevel; emoji: string; label: string }[] = [
  { id: 'empty',  emoji: '🟢', label: '여유' },
  { id: 'normal', emoji: '🟡', label: '보통' },
  { id: 'busy',   emoji: '🟠', label: '혼잡' },
  { id: 'full',   emoji: '🔴', label: '매우혼잡' },
];

interface Props {
  places: Place[];
}

export function ReportScreen({ places }: Props) {
  const router = useRouter();
  const [place, setPlace] = useState<string>(places[0]?.id ?? '');
  const [level, setLevel] = useState<CongestionLevel>('normal');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!place) { setError('장소를 선택해주세요'); return; }
    setError(null);
    const fd = new FormData();
    fd.set('place_id', place);
    fd.set('level', level);
    fd.set('note', note);
    startTransition(async () => {
      try {
        await submitReport(fd);
      } catch (e) {
        setError(e instanceof Error ? e.message : '제보 실패');
      }
    });
  };

  return (
    <>
      <StatusBar />
      <div className="screen-title-bar">
        <button type="button" className="back-btn" onClick={() => router.push('/')}>
          ◀
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 11 }}>제보하기</h1>
          <div className="sub">30초면 끝</div>
        </div>
        <div style={{ width: 32 }} />
      </div>

      <div className="form-section">
        <div className="form-label">📍 장소 <span className="req">*</span></div>
        <div className="chip-grid">
          {places.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`chip ${place === p.id ? 'active' : ''}`}
              onClick={() => setPlace(p.id)}
            >
              {p.emoji} {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <div className="form-label">🌡 혼잡도 <span className="req">*</span></div>
        <div className="congestion-picker">
          {LEVELS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`cong-option ${level === o.id ? `sel-${o.id}` : ''}`}
              onClick={() => setLevel(o.id)}
            >
              <div className="big-emoji">{o.emoji}</div>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <div className="form-label">💬 한 줄 제보</div>
        <div className="form-hint">선택 · 다른 유저에게 도움되는 정보</div>
        <input
          className="text-input"
          placeholder="예) 지금 20명 대기, 회전 빠름"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && (
        <div className="form-section" style={{ color: 'var(--p-red)', fontFamily: 'var(--f-body)', fontSize: 12 }}>
          ⚠ {error}
        </div>
      )}

      <button
        type="button"
        className="primary-btn"
        onClick={submit}
        disabled={pending}
        style={pending ? { opacity: 0.5 } : undefined}
      >
        {pending ? '▶ 등록 중 ▶' : '▶ 제보 등록 ▶'}
      </button>
    </>
  );
}
