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
    // 결제 → 일회용 입장 토큰 발급. play 페이지가 이걸 검증해야 진입 가능.
    try {
      localStorage.setItem(
        'oripa_pass',
        JSON.stringify({ packId: box.id, qty: pack.count, ts: Date.now() }),
      );
    } catch {
      /* localStorage 막혀도 진행 — play 페이지 가드는 fail-open 으로 동작 */
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
              <div className="ob-name" style={{ fontSize: 12 }}>{box.name}</div>
              <div className="ob-desc" style={{ fontSize: 8 }}>{box.desc}</div>
            </div>
          </div>
          {box.stats && <ModalStatsRow stats={box.stats} />}
        </div>

        {/* 상품 미리보기 (DB 팩 prizes 가 있을 때만) */}
        <PrizePreview prizes={box.prizes} />

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
                <div style={{ fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: 0.5 }}>
                  {p.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 9,
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
            fontSize: 9,
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
              fontSize: 11,
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
              fontSize: 8,
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
              fontSize: 8,
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
          {pending ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span
                aria-hidden
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '2px solid var(--ink)',
                  background: `linear-gradient(to bottom,
                    var(--red) 0,var(--red) 46%,
                    var(--ink) 46%,var(--ink) 54%,
                    var(--white) 54%,var(--white) 100%)`,
                  position: 'relative',
                  animation: 'pf-ball-spin 0.7s linear infinite',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--white)',
                    border: '1.5px solid var(--ink)',
                    transform: 'translate(-50%,-50%)',
                  }}
                />
              </span>
              구매 중...
            </span>
          ) : insufficient ? (
            '포인트 부족'
          ) : (
            '▶ 구매하고 뽑으러 가기 ▶'
          )}
        </button>
      </div>
    </div>
  );
}

/* ───────── 박스 잔여/등급별 현황 ───────── */

const STATS_GRADE_COLOR: Record<'S' | 'A' | 'B' | 'C', string> = {
  S: '#6B3FA0',
  A: '#3A5BD9',
  B: '#0D7377',
  C: '#8C5A00',
};

function ModalStatsRow({
  stats,
}: {
  stats: NonNullable<OripaBox['stats']>;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 5,
        marginTop: 8,
        padding: '5px 7px',
        background: 'rgba(0,0,0,.18)',
        fontFamily: 'var(--f1)',
        fontSize: 8,
        letterSpacing: 0.3,
      }}
    >
      <span style={{ color: 'var(--white)' }}>
        잔여 {stats.remaining}/{stats.total}
      </span>
      <span style={{ color: 'rgba(255,255,255,.4)' }}>·</span>
      {(['S', 'A', 'B', 'C'] as const).map((g) => (
        <span
          key={g}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 5px',
            background: STATS_GRADE_COLOR[g],
            color: 'var(--white)',
            boxShadow: '0 0 0 1px rgba(0,0,0,.3)',
          }}
        >
          {g} {stats.drawn[g]}
        </span>
      ))}
    </div>
  );
}

/* ───────────────────── 상품 미리보기 ───────────────────── */

const GRADE_COLOR: Record<string, string> = {
  S: 'var(--red)',
  A: 'var(--blu)',
  B: 'var(--orn)',
  C: 'var(--grn-dk)',
};

function PrizePreview({ prizes }: { prizes?: OripaBox['prizes'] }) {
  if (!prizes || prizes.length === 0) return null;
  const total = prizes.reduce((s, p) => s + (p.weight > 0 ? p.weight : 0), 0);
  if (total <= 0) return null;

  // 등급 우선(S→C) → 가중치 큰 순
  const order = ['S', 'A', 'B', 'C'] as const;
  const sorted = [...prizes].sort((a, b) => {
    const oa = order.indexOf(a.grade);
    const ob = order.indexOf(b.grade);
    if (oa !== ob) return oa - ob;
    return b.weight - a.weight;
  });

  return (
    <div
      style={{
        marginBottom: 10,
        padding: '8px 10px',
        background: 'var(--white)',
        boxShadow:
          '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 9,
          letterSpacing: 0.4,
          color: 'var(--ink)',
          marginBottom: 6,
        }}
      >
        🎁 들어있는 상품
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sorted.map((p, i) => {
          const pct = Math.round((p.weight / total) * 100);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--f1)',
                fontSize: 8,
                lineHeight: 1.7,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: 16,
                  height: 16,
                  background: GRADE_COLOR[p.grade] ?? 'var(--ink3)',
                  color: 'var(--white)',
                  fontSize: 7,
                  fontWeight: 'bold',
                }}
              >
                {p.grade}
              </span>
              <span style={{ flexShrink: 0, fontSize: 12 }}>{p.emoji}</span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'var(--ink2)',
                }}
                title={p.name}
              >
                {p.name}
              </span>
              <span
                style={{
                  flexShrink: 0,
                  color: 'var(--ink3)',
                  fontSize: 8,
                  letterSpacing: 0.3,
                }}
              >
                {pct >= 1 ? `${pct}%` : '<1%'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
