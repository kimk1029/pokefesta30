'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface EventPostData {
  id: number;
  title: string;
  body: string;
  imageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  pinned: boolean;
  published: boolean;
  createdAt: string;
}

type Draft = Omit<EventPostData, 'id' | 'createdAt'> & { id: number | null };

const EMPTY_DRAFT: Draft = {
  id: null,
  title: '',
  body: '',
  imageUrl: null,
  startsAt: null,
  endsAt: null,
  pinned: false,
  published: true,
};

export function EventPostManager({ initialPosts }: { initialPosts: EventPostData[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const startEdit = (p: EventPostData) => {
    setEditingId(p.id);
    setDraft({ ...p });
    setMsg(null);
  };
  const startNew = () => { setEditingId('new'); setDraft({ ...EMPTY_DRAFT }); setMsg(null); };
  const cancel = () => { setEditingId(null); setDraft(EMPTY_DRAFT); };

  const save = async () => {
    setBusy(true); setMsg(null);
    const isNew = editingId === 'new';
    const url = isNew ? '/api/event-posts' : `/api/event-posts/${draft.id}`;
    const payload = {
      title: draft.title,
      body: draft.body,
      imageUrl: draft.imageUrl || null,
      startsAt: draft.startsAt || null,
      endsAt: draft.endsAt || null,
      pinned: draft.pinned,
      published: draft.published,
    };
    try {
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: isNew ? '등록됨' : '저장됨' });
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : '저장 실패' });
    } finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('이 이벤트 글을 삭제할까요? 되돌릴 수 없습니다.')) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/event-posts/${id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setMsg({ type: 'ok', text: '삭제됨' });
      if (editingId === id) cancel();
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : '삭제 실패' });
    } finally { setBusy(false); }
  };

  const togglePublished = async (p: EventPostData) => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/event-posts/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !p.published }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : '상태 변경 실패' });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {msg && (
        <div style={{
          padding: '9px 12px', borderRadius: 6, fontSize: 12,
          background: msg.type === 'ok' ? '#ECFDF5' : '#FEF2F2',
          color: msg.type === 'ok' ? '#047857' : '#B91C1C',
        }}>
          {msg.type === 'ok' ? '✓ ' : '⚠ '}{msg.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#64748B' }}>총 {initialPosts.length}개</span>
        <button type="button" onClick={startNew} disabled={busy || editingId !== null} style={primaryBtn}>
          + 이벤트 글 작성
        </button>
      </div>

      {editingId === 'new' && (
        <section className="card">
          <h2>새 이벤트 글</h2>
          <PostForm draft={draft} setDraft={setDraft} />
          <FormActions onSave={save} onCancel={cancel} busy={busy} />
        </section>
      )}

      {initialPosts.map((p) => {
        const isEditing = editingId === p.id;
        return (
          <section key={p.id} className="card" style={{ opacity: p.published ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {p.pinned && <span style={{ ...chip, background: '#F59E0B' }}>📌 고정</span>}
                <span style={{ ...chip, background: p.published ? '#10B981' : '#94A3B8' }}>
                  {p.published ? '공개' : '비공개'}
                </span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  {p.startsAt || p.endsAt ? `${p.startsAt ?? ''} ~ ${p.endsAt ?? ''}` : '상시'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => togglePublished(p)} disabled={busy} style={smBtn('#64748B')}>
                  {p.published ? '숨김' : '공개'}
                </button>
                <button type="button" onClick={() => (isEditing ? cancel() : startEdit(p))} disabled={busy || (editingId !== null && !isEditing)} style={smBtn('#3B82F6')}>
                  {isEditing ? '닫기' : '수정'}
                </button>
                <button type="button" onClick={() => remove(p.id)} disabled={busy} style={smBtn('#EF4444')}>
                  삭제
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" style={{ width: 120, height: 68, flexShrink: 0, objectFit: 'cover', borderRadius: 6, background: '#F1F5F9' }} />
              )}
              <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.title}</div>
                <div style={{ color: '#475569', whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.body}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
                  등록 {p.createdAt.slice(0, 10)} · 웹:{' '}
                  <a href={`https://www.poke-30.com/events/${p.id}`} target="_blank" rel="noreferrer">
                    poke-30.com/events/{p.id}
                  </a>
                </div>
              </div>
            </div>

            {isEditing && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #E2E8F0' }}>
                <PostForm draft={draft} setDraft={setDraft} />
                <FormActions onSave={save} onCancel={cancel} busy={busy} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function FormActions({ onSave, onCancel, busy }: { onSave: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
      <button type="button" onClick={onSave} disabled={busy} style={primaryBtn}>
        {busy ? '저장 중…' : '저장'}
      </button>
      <button type="button" onClick={onCancel} disabled={busy} style={smBtn('#64748B')}>
        취소
      </button>
    </div>
  );
}

function PostForm({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const [uploading, setUploading] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    setUpErr(null); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/banners/upload', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      if (!body?.url) throw new Error('업로드 응답에 url 이 없습니다');
      setDraft({ ...draft, imageUrl: body.url });
    } catch (e) {
      setUpErr(e instanceof Error ? e.message : '업로드 실패');
    } finally { setUploading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Field label="제목">
        <input type="text" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={inp} />
      </Field>
      <Field label="본문 (줄바꿈 ⏎ 그대로 노출)">
        <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6} style={{ ...inp, resize: 'vertical' }} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="시작일 (비우면 상시)">
          <input type="date" value={draft.startsAt ?? ''} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value || null })} style={inp} />
        </Field>
        <Field label="종료일 (비우면 무기한)">
          <input type="date" value={draft.endsAt ?? ''} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value || null })} style={inp} />
        </Field>
      </div>

      <Field label="대표 이미지 URL (비우면 텍스트 카드)">
        <input
          type="text"
          value={draft.imageUrl ?? ''}
          onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value || null })}
          placeholder="https://… (아래에서 업로드 가능)"
          style={inp}
        />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ ...uploadBtn, opacity: uploading ? 0.6 : 1 }}>
          {uploading ? '업로드 중…' : '🖼 이미지 업로드 (jpg/png/webp, ≤4MB)'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => { onPickImage(e.target.files?.[0] ?? null); e.target.value = ''; }}
            style={{ display: 'none' }}
          />
        </label>
        {upErr && <span style={{ fontSize: 11, color: '#B91C1C' }}>⚠ {upErr}</span>}
        {draft.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.imageUrl} alt="미리보기" style={{ height: 64, width: 'auto', objectFit: 'contain', border: '1px solid #E2E8F0', borderRadius: 4, background: '#F8FAFC' }} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 18 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />
          목록 상단 고정
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
          공개 (웹 노출)
        </label>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '7px 9px', fontSize: 13, color: '#1A1A1A',
  background: '#fff', border: '1px solid #CBD5E1', borderRadius: 6, outline: 'none', boxSizing: 'border-box',
};
const primaryBtn: React.CSSProperties = {
  padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#fff',
  background: '#3B82F6', border: 'none', borderRadius: 6, cursor: 'pointer',
};
function smBtn(bg: string): React.CSSProperties {
  return { padding: '5px 10px', fontSize: 12, color: '#fff', background: bg, border: 'none', borderRadius: 6, cursor: 'pointer' };
}
const uploadBtn: React.CSSProperties = {
  display: 'inline-block', padding: '8px 12px', fontSize: 12, color: '#334155',
  background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6, cursor: 'pointer',
};
const chip: React.CSSProperties = {
  fontSize: 11, padding: '3px 7px', borderRadius: 4, background: '#1E293B', color: '#fff', lineHeight: 1,
};
