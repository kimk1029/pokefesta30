'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteFeedButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!confirm(`피드 #${id} 를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      alert(`삭제 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="btn btn-danger" onClick={onClick} disabled={busy}>
      {busy ? '삭제중…' : '삭제'}
    </button>
  );
}
