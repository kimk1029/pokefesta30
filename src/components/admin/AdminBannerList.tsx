'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export interface BannerData {
  id: number;
  sortOrder: number;
  slideClass: string;
  badge: string;
  title: string;
  sub: string;
  ctaHint: string | null;
  visualType: string;
  visualValue: string;
  onClick: string | null;
  active: boolean;
}

type Draft = Omit<BannerData, 'id'> & { id: number | null };

const SLIDE_CLASSES = ['slide-a', 'slide-b', 'slide-c', 'slide-d'] as const;
const VISUAL_TYPES = [
  { v: 'emoji', l: '이모지' },
  { v: 'image', l: '이미지' },
] as const;
const ON_CLICKS = [
  { v: '', l: '없음' },
  { v: 'stamp-rally', l: '스탬프 랠리 모달' },
  { v: 'oripa', l: '오리파 페이지' },
] as const;

const EMPTY_DRAFT: Draft = {
  id: null,
  sortOrder: 50,
  slideClass: 'slide-a',
  badge: '',
  title: '',
  sub: '',
  ctaHint: null,
  visualType: 'emoji',
  visualValue: '✨',
  onClick: null,
  active: true,
};

interface Props {
  initialBanners: BannerData[];
}

export function AdminBannerList({ initialBanners }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const startEdit = (b: BannerData) => {
    setEditingId(b.id);
    setDraft({ ...b });
    setErr(null);
    setMsg(null);
  };

  const startNew = () => {
    setEditingId('new');
    setDraft({ ...EMPTY_DRAFT });
    setErr(null);
    setMsg(null);
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErr(null);
  };

  const save = () => {
    setErr(null);
    setMsg(null);
    const isNew = editingId === 'new';
    const url = isNew ? '/api/admin/banners' : `/api/admin/banners/${draft.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    const payload = {
      sortOrder: draft.sortOrder,
      slideClass: draft.slideClass,
      badge: draft.badge,
      title: draft.title,
      sub: draft.sub,
      ctaHint: draft.ctaHint || null,
      visualType: draft.visualType,
      visualValue: draft.visualValue,
      onClick: draft.onClick || null,
      active: draft.active,
    };

    startTransition(async () => {
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        setMsg(isNew ? '✓ 추가됨' : '✓ 저장됨');
        setEditingId(null);
        router.refresh();
        setTimeout(() => setMsg(null), 1600);
      } catch (e) {
        setErr(e instanceof Error ? e.message : '저장 실패');
      }
    });
  };

  const remove = (id: number) => {
    if (!window.confirm('이 배너를 삭제할까요? 되돌릴 수 없습니다.')) return;
    setErr(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        setMsg('✓ 삭제됨');
        if (editingId === id) cancel();
        router.refresh();
        setTimeout(() => setMsg(null), 1600);
      } catch (e) {
        setErr(e instanceof Error ? e.message : '삭제 실패');
      }
    });
  };

  const toggleActive = (b: BannerData) => {
    setErr(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/banners/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: !b.active }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : '상태 변경 실패');
      }
    });
  };

  return (
    <div style={{ padding: '0 var(--gap)' }}>
      {msg && (
        <div
          style={{
            marginBottom: 10,
            padding: '8px 10px',
            background: 'var(--ink)',
            color: 'var(--yel)',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
        >
          {msg}
        </div>
      )}
      {err && (
        <div
          style={{
            marginBottom: 10,
            padding: '8px 10px',
            background: 'var(--red)',
            color: 'var(--white)',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
        >
          ⚠ {err}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink2)', letterSpacing: 0.5 }}>
          총 {initialBanners.length}개 · 비활성 배너는 홈에서 노출되지 않습니다
        </div>
        <button
          type="button"
          onClick={startNew}
          disabled={pending || editingId !== null}
          style={btnStyle('var(--blu)')}
        >
          + 추가
        </button>
      </div>

      {editingId === 'new' && (
        <div style={editorBoxStyle}>
          <div style={editorHeaderStyle}>새 배너</div>
          <BannerForm draft={draft} setDraft={setDraft} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={save} disabled={pending} style={btnStyle('var(--grn-dk)')}>
              {pending ? '저장 중…' : '저장'}
            </button>
            <button type="button" onClick={cancel} disabled={pending} style={btnStyle('var(--ink2)')}>
              취소
            </button>
          </div>
        </div>
      )}

      {initialBanners.map((b) => {
        const isEditing = editingId === b.id;
        return (
          <div key={b.id} style={{ ...rowBoxStyle, opacity: b.active ? 1 : 0.55 }}>
            <div style={rowHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={badgeChipStyle}>#{b.sortOrder}</span>
                <span style={{ ...badgeChipStyle, background: 'var(--pap2)' }}>{b.slideClass}</span>
                <span
                  style={{
                    ...badgeChipStyle,
                    background: b.active ? 'var(--grn-dk)' : 'var(--ink3)',
                    color: 'var(--white)',
                  }}
                >
                  {b.active ? 'ON' : 'OFF'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => toggleActive(b)}
                  disabled={pending}
                  style={btnStyleSm(b.active ? 'var(--ink3)' : 'var(--grn-dk)')}
                >
                  {b.active ? '숨김' : '노출'}
                </button>
                <button
                  type="button"
                  onClick={() => (isEditing ? cancel() : startEdit(b))}
                  disabled={pending || (editingId !== null && !isEditing)}
                  style={btnStyleSm('var(--blu)')}
                >
                  {isEditing ? '닫기' : '수정'}
                </button>
                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  disabled={pending}
                  style={btnStyleSm('var(--red)')}
                >
                  삭제
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, fontFamily: 'var(--f1)', fontSize: 10, lineHeight: 1.6, color: 'var(--ink)' }}>
              <div style={{ color: 'var(--red)' }}>{b.badge}</div>
              <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'pre-line', margin: '4px 0' }}>{b.title}</div>
              <div style={{ color: 'var(--ink2)', whiteSpace: 'pre-line' }}>{b.sub}</div>
              <div style={{ marginTop: 6, fontSize: 9, color: 'var(--ink3)' }}>
                visual: {b.visualType} · {b.visualValue}
                {b.ctaHint && <> · CTA: {b.ctaHint}</>}
                {b.onClick && <> · onClick: {b.onClick}</>}
              </div>
            </div>

            {isEditing && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(0,0,0,.2)' }}>
                <BannerForm draft={draft} setDraft={setDraft} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button type="button" onClick={save} disabled={pending} style={btnStyle('var(--grn-dk)')}>
                    {pending ? '저장 중…' : '저장'}
                  </button>
                  <button type="button" onClick={cancel} disabled={pending} style={btnStyle('var(--ink2)')}>
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BannerForm({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Field label="정렬 (작을수록 먼저)">
        <input
          type="number"
          value={draft.sortOrder}
          onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })}
          style={inputStyle}
        />
      </Field>

      <Field label="슬라이드 색상 클래스">
        <select
          value={draft.slideClass}
          onChange={(e) => setDraft({ ...draft, slideClass: e.target.value })}
          style={inputStyle}
        >
          {SLIDE_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="뱃지 (예: ★ 팬 프로젝트)">
        <input
          type="text"
          value={draft.badge}
          onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
          style={inputStyle}
        />
      </Field>

      <Field label="제목 (줄바꿈은 ⏎ 키)">
        <textarea
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </Field>

      <Field label="설명 (줄바꿈은 ⏎ 키)">
        <textarea
          value={draft.sub}
          onChange={(e) => setDraft({ ...draft, sub: e.target.value })}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </Field>

      <Field label="CTA 힌트 (예: 👉 TAP, 비우면 숨김)">
        <input
          type="text"
          value={draft.ctaHint ?? ''}
          onChange={(e) => setDraft({ ...draft, ctaHint: e.target.value || null })}
          style={inputStyle}
        />
      </Field>

      <Field label="비주얼 타입">
        <select
          value={draft.visualType}
          onChange={(e) => setDraft({ ...draft, visualType: e.target.value })}
          style={inputStyle}
        >
          {VISUAL_TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.l}
            </option>
          ))}
        </select>
      </Field>

      <Field label={draft.visualType === 'emoji' ? '이모지 (예: 💬)' : '이미지 경로 (예: /promo/foo.png)'}>
        <input
          type="text"
          value={draft.visualValue}
          onChange={(e) => setDraft({ ...draft, visualValue: e.target.value })}
          style={inputStyle}
        />
      </Field>

      <Field label="클릭 동작">
        <select
          value={draft.onClick ?? ''}
          onChange={(e) => setDraft({ ...draft, onClick: e.target.value || null })}
          style={inputStyle}
        >
          {ON_CLICKS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </Field>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--f1)', fontSize: 10 }}>
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        활성 (홈 노출)
      </label>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink2)', marginBottom: 4, letterSpacing: 0.5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontFamily: 'var(--f1)',
  fontSize: 11,
  color: 'var(--ink)',
  background: 'var(--white)',
  border: '1px solid var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
};

const editorBoxStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: 12,
  background: 'var(--white)',
  boxShadow:
    '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
};

const editorHeaderStyle: React.CSSProperties = {
  fontFamily: 'var(--f1)',
  fontSize: 10,
  color: 'var(--ink)',
  letterSpacing: 0.5,
  marginBottom: 10,
  fontWeight: 700,
};

const rowBoxStyle: React.CSSProperties = {
  marginBottom: 10,
  padding: 10,
  background: 'var(--white)',
  boxShadow:
    '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
};

const rowHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
};

const badgeChipStyle: React.CSSProperties = {
  fontFamily: 'var(--f1)',
  fontSize: 8,
  letterSpacing: 0.3,
  padding: '3px 6px',
  background: 'var(--ink)',
  color: 'var(--white)',
  lineHeight: 1,
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '8px 12px',
    fontFamily: 'var(--f1)',
    fontSize: 9,
    letterSpacing: 0.5,
    color: 'var(--white)',
    background: bg,
    border: 'none',
    cursor: 'pointer',
  };
}

function btnStyleSm(bg: string): React.CSSProperties {
  return {
    padding: '4px 8px',
    fontFamily: 'var(--f1)',
    fontSize: 8,
    letterSpacing: 0.3,
    color: 'var(--white)',
    background: bg,
    border: 'none',
    cursor: 'pointer',
  };
}
