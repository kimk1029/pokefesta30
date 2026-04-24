'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface OripaPackFormValue {
  id: string;
  tier: string;
  emoji: string;
  name: string;
  desc: string;
  price: number;
  ticketsCount: number;
  prizes: unknown[];
  active: boolean;
}

interface Props {
  mode: 'create' | 'edit';
  initial?: Partial<OripaPackFormValue>;
}

const DEFAULT_PRIZES = [
  { grade: 'S', name: '', emoji: '🖼', weight: 3,  bg: '#6B3FA0' },
  { grade: 'A', name: '', emoji: '🏅', weight: 12, bg: '#3A5BD9' },
  { grade: 'B', name: '', emoji: '⚪', weight: 25, bg: '#E63946' },
  { grade: 'C', name: '', emoji: '🌟', weight: 60, bg: '#4ADE80' },
];

export function OripaPackForm({ mode, initial }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [id, setId] = useState(initial?.id ?? '');
  const [tier, setTier] = useState(initial?.tier ?? 'normal');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🎁');
  const [name, setName] = useState(initial?.name ?? '');
  const [desc, setDesc] = useState(initial?.desc ?? '');
  const [price, setPrice] = useState(String(initial?.price ?? 200));
  const [ticketsCount, setTicketsCount] = useState(String(initial?.ticketsCount ?? 100));
  const [active, setActive] = useState(initial?.active ?? true);
  const [prizesText, setPrizesText] = useState(
    JSON.stringify(initial?.prizes ?? DEFAULT_PRIZES, null, 2),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let prizes: unknown;
      try {
        prizes = JSON.parse(prizesText);
      } catch {
        throw new Error('상품(prizes) 은 JSON 형식이어야 합니다.');
      }
      const body = {
        id: id.trim(),
        tier: tier.trim(),
        emoji: emoji.trim(),
        name: name.trim(),
        desc: desc.trim(),
        price: Number(price),
        ticketsCount: Number(ticketsCount),
        prizes,
        active,
      };
      const url = mode === 'create' ? '/api/oripa/packs' : `/api/oripa/packs/${encodeURIComponent(id)}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `HTTP ${res.status}`);
      }
      router.push('/oripa/packs');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirm(`팩 "${id}" 을(를) 삭제할까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/oripa/packs/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.push('/oripa/packs');
      router.refresh();
    } catch (e) {
      alert(`삭제 실패: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card" style={{ display: 'grid', gap: 14, maxWidth: 800 }}>
      {error && (
        <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '10px 14px', borderRadius: 6, fontSize: 12 }}>
          ⚠ {error}
        </div>
      )}

      <Field label="ID (URL/캐시 키 — 영문·하이픈 권장)">
        <input
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
          disabled={mode === 'edit'}
          placeholder="box-legend"
          style={inputStyle}
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="티어">
          <input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="normal" style={inputStyle} />
        </Field>
        <Field label="이모지">
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} style={inputStyle} />
        </Field>
        <Field label="가격 (P)">
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={0} style={inputStyle} />
        </Field>
      </div>

      <Field label="이름">
        <input required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </Field>

      <Field label="설명">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="티켓 수">
          <input type="number" value={ticketsCount} onChange={(e) => setTicketsCount(e.target.value)} min={1} style={inputStyle} />
        </Field>
        <Field label="활성 여부">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span style={{ fontSize: 13 }}>메인 앱 뽑기 화면에 노출</span>
          </label>
        </Field>
      </div>

      <Field label="상품 (prizes JSON) — grade: S/A/B/C, weight 는 0 이상 숫자">
        <textarea
          value={prizesText}
          onChange={(e) => setPrizesText(e.target.value)}
          rows={14}
          style={{ ...inputStyle, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12 }}
        />
      </Field>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={busy} className="btn" style={{ background: '#3B82F6', color: '#fff', borderColor: '#3B82F6' }}>
            {busy ? '저장중…' : mode === 'create' ? '생성' : '저장'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn" disabled={busy}>
            취소
          </button>
        </div>
        {mode === 'edit' && (
          <button type="button" onClick={del} disabled={busy} className="btn btn-danger">
            삭제
          </button>
        )}
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #CBD5E1',
  borderRadius: 5,
  fontSize: 13,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#64748B', letterSpacing: 0.3 }}>{label}</span>
      {children}
    </label>
  );
}
