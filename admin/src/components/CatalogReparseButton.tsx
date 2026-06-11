'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** 카드 카탈로그 전체 재파싱 버튼 — 게임 구분 + 세트코드/카드번호 백필. */
export function CatalogReparseButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    if (!confirm('카탈로그 전체를 최신 파서로 재파싱할까요? (게임 구분 + 세트코드/카드번호 채움)')) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/cards-catalog/reparse', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setMsg(`✓ ${body.total}건 중 ${body.updated}건 갱신 · 코드/번호 미파싱 ${body.stillMissing}건 남음`);
      router.refresh();
    } catch (e) {
      setMsg(`⚠ ${e instanceof Error ? e.message : '재파싱 실패'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button type="button" className="btn" onClick={run} disabled={busy}>
        {busy ? '재파싱 중…' : '🔄 정적정보 재파싱'}
      </button>
      {msg && <span style={{ fontSize: 11, color: msg.startsWith('⚠') ? '#B91C1C' : '#047857' }}>{msg}</span>}
    </span>
  );
}
