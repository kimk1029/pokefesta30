'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
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
  /** 결제(server action) 진행 중 */
  const [paying, setPaying] = useState(false);
  /** router.push 후 destination 마운트 대기 — useTransition 으로 자동 토글 */
  const [navigating, startNav] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const pack = PACKS[selected];
  const unit = box.price;
  const subtotal = unit * pack.count;
  const discount = Math.floor(subtotal * pack.discount);
  const total = subtotal - discount;
  const insufficient = inv.points < total;
  const busy = paying || navigating;

  // play 페이지를 백그라운드에서 미리 prefetch — 결제 후 이동 빠르게
  useEffect(() => {
    router.prefetch(`/my/oripa/play?pack=${box.id}&qty=${pack.count}`);
  }, [router, box.id, pack.count]);

  const buy = async () => {
    if (busy) return;
    setErr(null);
    setPaying(true);
    const r = await inv.spend(total);
    if (!r.ok) {
      setPaying(false);
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
    // 라우팅을 transition 으로 wrap → destination 마운트 끝날 때까지 navigating=true 유지.
    // paying 은 그대로 true 유지 → 모달 unmount 까지 버튼 활성화 윈도우 0.
    startNav(() => {
      router.push(`/my/oripa/play?pack=${box.id}&qty=${pack.count}`);
    });
  };

  // busy 중엔 overlay/X 클릭으로도 닫히지 않게 — 결제 직후 모달이 사라지면 spinner 도 같이 사라져 어색함
  const safeClose = () => {
    if (busy) return;
    onClose();
  };

  return (
    <div className="avatar-overlay oripa-purchase-overlay" onClick={safeClose}>
      <div
        className="avatar-modal oripa-purchase-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="avatar-modal-head">
          <span>뽑기 구매</span>
          <button
            type="button"
            onClick={safeClose}
            aria-label="닫기"
            className="avatar-close"
            disabled={busy}
            style={{ opacity: busy ? 0.4 : 1 }}
          >
            ✕
          </button>
        </div>

        {/* 스크롤 본문 — CTA 는 항상 모달 하단에 고정 */}
        <div
          className="oripa-purchase-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Box 요약 */}
          <div
            className={`oripa-box ${box.tier}`}
            style={{ marginBottom: 0, padding: '10px 12px 8px' }}
          >
            <div className="ob-top" style={{ gap: 9 }}>
              <div className="ob-icon" style={{ width: 44, height: 44, fontSize: 24 }}>
                {box.emoji}
              </div>
              <div className="ob-meta">
                <div className="ob-name" style={{ fontSize: 11, marginTop: 0 }}>{box.name}</div>
                <div className="ob-desc" style={{ fontSize: 8, marginTop: 4 }}>{box.desc}</div>
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
              gap: 6,
              margin: 0,
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
                disabled={busy}
                className={`avatar-tile${active ? ' active' : ''}`}
                style={{ aspectRatio: 'auto', padding: '7px 6px', minHeight: 54, opacity: busy ? 0.5 : 1 }}
              >
                <div style={{ fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: 0.5 }}>
                  {p.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 9,
                    color: active ? 'var(--ink)' : 'var(--red)',
                    marginTop: 2,
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
                      marginTop: 2,
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
              padding: '8px 10px',
              background: 'var(--pap2)',
              fontFamily: 'var(--f1)',
              fontSize: 9,
              lineHeight: 1.55,
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
                marginTop: 4,
                paddingTop: 4,
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
                marginTop: 3,
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
                padding: '4px 10px',
                color: 'var(--red)',
                fontFamily: 'var(--f1)',
                fontSize: 8,
                textAlign: 'center',
              }}
            >
              ⚠ {err}
            </div>
          )}
        </div>
        {/* /스크롤 본문 */}

        <button
          type="button"
          onClick={buy}
          disabled={busy || insufficient}
          className="pri-btn oripa-purchase-cta"
          style={{
            opacity: insufficient && !busy ? 0.55 : 1,
            cursor: busy ? 'wait' : insufficient ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? (
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
              {paying ? '결제 중...' : '뽑기판 여는 중...'}
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
        marginBottom: 0,
        padding: '6px 9px 7px',
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
          marginBottom: 4,
        }}
      >
        🎁 들어있는 상품
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                lineHeight: 1.4,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: 15,
                  height: 15,
                  background: GRADE_COLOR[p.grade] ?? 'var(--ink3)',
                  color: 'var(--white)',
                  fontSize: 7,
                  fontWeight: 'bold',
                }}
              >
                {p.grade}
              </span>
              <span style={{ flexShrink: 0, fontSize: 11 }}>{p.emoji}</span>
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
