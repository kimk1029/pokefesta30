'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRouteTransition } from '@/components/RouteProgress';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/events';

/** 이벤트 게시판 회원 글쓰기 폼 — 말머리 + 제목 + 본문. */
export function EventWriteForm() {
  const router = useRouter();
  const [category, setCategory] = useState<EventCategory>('구매');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    if (saving) return;
    if (!title.trim()) {
      setErr('제목을 입력해주세요');
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      const r = await fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category, title: title.trim(), body: body.trim() }),
      });
      if (r.status === 401) {
        setErr('로그인해주세요');
        return;
      }
      if (!r.ok) {
        const data = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `HTTP ${r.status}`);
      }
      startRouteTransition();
      router.push('/events');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '등록 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cv-manual-form" style={{ margin: '0 var(--gap)' }}>
      <div className="cv-manual-field">
        <div className="cv-manual-label">말머리</div>
        <div className="cv-manual-catalog">
          {EVENT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`cv-manual-cat-btn${category === c ? ' on' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="cv-manual-field">
        <div className="cv-manual-label">제목</div>
        <input
          className="cv-manual-input"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="이벤트/모임 제목"
        />
      </div>
      <div className="cv-manual-field">
        <div className="cv-manual-label">내용</div>
        <textarea
          className="cv-manual-input cv-manual-textarea"
          rows={8}
          maxLength={3000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="이벤트 내용, 일정, 장소 등을 적어주세요"
        />
      </div>
      {err && <div className="cv-manual-err">⚠ {err}</div>}
      <button type="button" className="cv-manual-submit" disabled={saving} onClick={onSubmit}>
        {saving ? '등록 중…' : '＋ 글 등록'}
      </button>
    </div>
  );
}
