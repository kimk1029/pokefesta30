'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useInventory } from './InventoryProvider';
import type { OripaBox } from '@/lib/types';

interface Props {
  box: OripaBox;
  onClose: () => void;
}

interface Pack {
  count: number;
  discount: number; // 0 = no discount, 0.1 = 10% off etc.
  label: string;
}

const PACKS: Pack[] = [
  { count: 1,  discount: 0,    label: '1회' },
  { count: 5,  discount: 0.05, label: '5회' },
  { count: 10, discount: 0.10, label: '10회' },
];

export function OripaPurchaseModal({ box, onClose }: Props) {
  const router = useRouter();
  const inv = useInventory();
  const [selected, setSelected] = useState(0);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pack = PACKS[selected];
  const unit = box.price;
  const subtotal = unit * pack.count;
  const discount = Math.floor(subtotal * pack.discount);
  const total = subtotal - discount;
  const insufficient = inv.points < total;

  const buy = async () => {
    if (pending) return;
    setErr(null);
    setPending(true);
    const r = await inv.spend(total);
    setPending(false);
    if (!r.ok) {
      setErr(r.msg ?? '구매 실패');
      return;
    }
    router.push(`/my/oripa/play?pack=${box.id}&qty=${pack.count}`);
  };

  return (
    <div className="avatar-overlay" onClick={onClose}>
      <div className="avatar-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320 }}>
        <div className="avatar-modal-head">
          <span>뽑기 구매</span>
          <button type="button" onClick={onClose} aria-label="닫기" className="avatar-close">
            ✕
          </button>
        </div>

        {/* Box 요약 */}
        <div className={`oripa-box ${box.tier}`} style={{ marginBottom: 10 }}>
          <div className="ob-top">
            <div className="ob-icon">{box.emoji}</div>
            <div className="ob-meta">
              <div className="ob-name" style={{ fontSize: 13 }}>{box.name}</div>
              <div className="ob-desc" style={{ fontSize: 8 }}>{box.desc}</div>
            </div>
          </div>
        </div>

        {/* 수량 선택 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 8,
            margin: '0 0 10px',
          }}
        >
          {PACKS.map((p, i) => {
            const active = i === selected;
            const t = unit * p.count - Math.floor(unit * p.count * p.discount);
            return (
              <button
                key={p.count}
                type="button"
                onClick={() => setSelected(i)}
                className={`avatar-tile${active ? ' active' : ''}`}
                style={{ aspectRatio: 'auto', padding: '10px 6px', minHeight: 72 }}
              >
                <div style={{ fontFamily: 'var(--f1)', fontSize: 13, letterSpacing: 0.5 }}>
                  {p.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 10,
                    color: active ? 'var(--ink)' : 'var(--red)',
                    marginTop: 4,
                  }}
                >
                  🪙 {t.toLocaleString()}
                </div>
                {p.discount > 0 && (
                  <div
                    style={{
                      fontFamily: 'var(--f1)',
                      fontSize: 8,
                      color: 'var(--grn-dk)',
                      marginTop: 4,
                    }}
                  >
                    -{Math.round(p.discount * 100)}%
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 요약 영역 */}
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--pap2)',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            lineHeight: 1.9,
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>단가 × {pack.count}</span>
            <span>🪙 {subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--grn-dk)' }}>
              <span>세트 할인</span>
              <span>-🪙 {discount.toLocaleString()}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              paddingTop: 6,
              borderTop: '2px dashed var(--ink3)',
              fontSize: 12,
              color: 'var(--red)',
            }}
          >
            <span>총 결제</span>
            <span>🪙 {total.toLocaleString()}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontSize: 9,
              color: 'var(--ink3)',
            }}
          >
            <span>보유</span>
            <span>🪙 {inv.points.toLocaleString()}</span>
          </div>
        </div>

        {err && (
          <div
            style={{
              marginTop: 8,
              padding: '6px 10px',
              color: 'var(--red)',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              textAlign: 'center',
            }}
          >
            ⚠ {err}
          </div>
        )}

        <button
          type="button"
          onClick={buy}
          disabled={pending || insufficient}
          className="pri-btn"
          style={{ width: 'auto', margin: '12px 0 0', opacity: insufficient ? 0.55 : 1 }}
        >
          {pending
            ? '▶ 구매 중 ▶'
            : insufficient
              ? '포인트 부족'
              : `▶ 구매하고 뽑으러 가기 ▶`}
        </button>
      </div>
    </div>
  );
}
