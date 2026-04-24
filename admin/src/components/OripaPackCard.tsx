'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Prize {
  grade: 'S' | 'A' | 'B' | 'C';
  name: string;
  emoji: string;
  weight: number;
  bg?: string;
  imageUrl?: string;
}

interface Pack {
  id: string;
  tier: string;
  emoji: string;
  name: string;
  desc: string;
  price: number;
  ticketsCount: number;
  prizes: Prize[];
  active: boolean;
}

const GRADES: Prize['grade'][] = ['S', 'A', 'B', 'C'];

export function OripaPackCard({ initial, isDefault }: { initial: Pack; isDefault: boolean }) {
  const router = useRouter();
  const [pack, setPack] = useState<Pack>(initial);
  const [busy, setBusy] = useState<null | string>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const update = <K extends keyof Pack>(k: K, v: Pack[K]) => setPack((p) => ({ ...p, [k]: v }));

  const setPrize = (i: number, p: Partial<Prize>) => {
    setPack((cur) => {
      const list = [...cur.prizes];
      list[i] = { ...list[i], ...p };
      return { ...cur, prizes: list };
    });
  };
  const addPrize = () => setPack((cur) => ({
    ...cur,
    prizes: [...cur.prizes, { grade: 'C', name: '새 상품', emoji: '🎁', weight: 10, bg: '#94A3B8', imageUrl: '' }],
  }));
  const removePrize = (i: number) => setPack((cur) => ({ ...cur, prizes: cur.prizes.filter((_, x) => x !== i) }));

  const save = async () => {
    setBusy('save'); setMsg(null);
    try {
      const res = await fetch(`/api/oripa/packs/${encodeURIComponent(pack.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: pack.tier, emoji: pack.emoji, name: pack.name, desc: pack.desc,
          price: pack.price, ticketsCount: pack.ticketsCount,
          prizes: pack.prizes, active: pack.active,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ type: 'ok', text: '저장 완료' });
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(null); }
  };

  const reset = async () => {
    if (!confirm(`${pack.name} 을(를) 기본값으로 초기화할까요?\n변경한 내용은 모두 사라집니다.`)) return;
    setBusy('reset'); setMsg(null);
    try {
      const res = await fetch(`/api/oripa/packs/${encodeURIComponent(pack.id)}/reset`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const { data } = await res.json();
      setPack(data);
      setMsg({ type: 'ok', text: '기본값으로 초기화됨' });
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(null); }
  };

  const remove = async () => {
    if (!confirm(`${pack.name} 을(를) 삭제할까요?`)) return;
    setBusy('del');
    try {
      const res = await fetch(`/api/oripa/packs/${encodeURIComponent(pack.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally { setBusy(null); }
  };

  const totalWeight = pack.prizes.reduce((s, p) => s + (Number.isFinite(p.weight) ? p.weight : 0), 0);

  return (
    <section className="card" style={{ padding: 20 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 36 }}>{pack.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{pack.name}</div>
          <div className="mono" style={{ fontSize: 11, color: '#64748B' }}>{pack.id} · {pack.tier}</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={pack.active} onChange={(e) => update('active', e.target.checked)} />
          활성
        </label>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 10, marginBottom: 14 }}>
        <Field label="이모지">
          <input value={pack.emoji} onChange={(e) => update('emoji', e.target.value)} maxLength={4} style={input} />
        </Field>
        <Field label="티어">
          <input value={pack.tier} onChange={(e) => update('tier', e.target.value)} style={input} />
        </Field>
        <Field label="이름">
          <input value={pack.name} onChange={(e) => update('name', e.target.value)} style={input} />
        </Field>
        <Field label="가격 (P)">
          <input type="number" value={pack.price} onChange={(e) => update('price', Number(e.target.value) || 0)} style={input} />
        </Field>
        <Field label="티켓 수">
          <input type="number" value={pack.ticketsCount} onChange={(e) => update('ticketsCount', Number(e.target.value) || 100)} style={input} />
        </Field>
      </div>
      <Field label="설명">
        <input value={pack.desc} onChange={(e) => update('desc', e.target.value)} style={input} />
      </Field>

      <div style={{ margin: '14px 0 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          상품 ({pack.prizes.length}개) · 가중치 합 {totalWeight}
        </div>
        <button type="button" className="btn" onClick={addPrize}>+ 상품 추가</button>
      </div>

      <table className="tbl" style={{ marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ width: 60 }}></th>
            <th style={{ width: 90 }}>등급</th>
            <th style={{ width: 60 }}>이모지</th>
            <th>이름</th>
            <th style={{ width: 100 }}>가중치</th>
            <th style={{ width: 90 }}>BG</th>
            <th>이미지 URL</th>
            <th style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          {pack.prizes.map((pz, i) => (
            <tr key={i}>
              <td>
                {pz.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pz.imageUrl} alt="" width={40} height={40} style={{ objectFit: 'cover', background: '#F1F5F9' }} />
                ) : (
                  <div style={{ width: 40, height: 40, background: pz.bg ?? '#F1F5F9', display: 'grid', placeItems: 'center', fontSize: 22 }}>
                    {pz.emoji}
                  </div>
                )}
              </td>
              <td>
                <select value={pz.grade} onChange={(e) => setPrize(i, { grade: e.target.value as Prize['grade'] })} style={input}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </td>
              <td>
                <input value={pz.emoji} onChange={(e) => setPrize(i, { emoji: e.target.value })} maxLength={4} style={input} />
              </td>
              <td>
                <input value={pz.name} onChange={(e) => setPrize(i, { name: e.target.value })} style={input} />
              </td>
              <td>
                <input type="number" value={pz.weight} onChange={(e) => setPrize(i, { weight: Number(e.target.value) || 0 })} style={input} />
              </td>
              <td>
                <input value={pz.bg ?? ''} onChange={(e) => setPrize(i, { bg: e.target.value })} placeholder="#FFD23F" style={input} />
              </td>
              <td>
                <input value={pz.imageUrl ?? ''} onChange={(e) => setPrize(i, { imageUrl: e.target.value })} placeholder="https://..." style={input} />
              </td>
              <td>
                <button type="button" className="btn btn-danger" onClick={() => removePrize(i)} style={{ fontSize: 11, padding: '4px 8px' }}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {msg && (
        <div style={{
          padding: '8px 12px', borderRadius: 5, fontSize: 12, marginBottom: 10,
          background: msg.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
          color: msg.type === 'ok' ? '#166534' : '#B91C1C',
        }}>
          {msg.type === 'ok' ? '✓' : '⚠'} {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={save} disabled={!!busy}
            style={{ background: '#3B82F6', color: '#fff', borderColor: '#3B82F6' }}>
            {busy === 'save' ? '저장중…' : '저장'}
          </button>
          {isDefault && (
            <button type="button" className="btn" onClick={reset} disabled={!!busy}>
              {busy === 'reset' ? '초기화중…' : '초기화 (기본값 복원)'}
            </button>
          )}
        </div>
        {!isDefault && (
          <button type="button" className="btn btn-danger" onClick={remove} disabled={!!busy}>
            {busy === 'del' ? '삭제중…' : '팩 삭제'}
          </button>
        )}
      </div>
    </section>
  );
}

const input: React.CSSProperties = {
  width: '100%', padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: 5, fontSize: 12,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 10, color: '#64748B', letterSpacing: 0.3 }}>{label}</span>
      {children}
    </label>
  );
}
