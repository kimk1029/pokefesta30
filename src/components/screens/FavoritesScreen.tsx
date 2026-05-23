'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import type { MyFavoriteRow } from '@/lib/queries';

interface Props {
  favorites: MyFavoriteRow[];
}

export function FavoritesScreen({ favorites: initial }: Props) {
  const [rows, setRows] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onRemove = (apparelId: number) => {
    if (pending) return;
    if (!confirm('관심카드에서 제거할까요?')) return;
    setErr(null);
    startTransition(async () => {
      try {
        const r = await fetch(`/api/me/favorites/${apparelId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setRows((prev) => prev.filter((x) => x.snkrdunkApparelId !== apparelId));
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : '제거 실패');
      }
    });
  };

  const pricedTotal = rows.reduce((s, r) => s + r.minPriceJpy, 0);

  return (
    <>
      <StatusBar />
      <AppBar title="관심카드" showBack backHref="/my" />
      <div style={{ height: 12 }} />

      <div className="sect">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--white)',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 14, letterSpacing: 0.4 }}>
              ⭐ 관심카드
            </div>
            <div
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 9,
                color: 'var(--ink3)',
                marginTop: 4,
                lineHeight: 1.6,
              }}
            >
              {rows.length}개 · 합산 시세 ¥{pricedTotal.toLocaleString('ja-JP')}
              <br />
              <span style={{ color: 'var(--ink3)' }}>※ 포트폴리오 총합엔 포함되지 않습니다.</span>
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div
          style={{
            padding: '8px 12px',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--red)',
            textAlign: 'center',
          }}
        >
          ⚠ {err}
        </div>
      )}

      {rows.length === 0 ? (
        <div
          style={{
            margin: '20px var(--gap)',
            padding: 30,
            textAlign: 'center',
            background: 'var(--white)',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink3)',
            lineHeight: 1.7,
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
          }}
        >
          관심카드가 없어요
          <br />
          시세상세 페이지에서 ⭐ 관심카드 버튼을 눌러보세요.
        </div>
      ) : (
        <div className="sect">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
            }}
          >
            {rows.map((row) => (
              <FavoriteCard key={row.id} row={row} onRemove={onRemove} />
            ))}
          </div>
        </div>
      )}

      <div className="bggap" />
    </>
  );
}

function FavoriteCard({
  row,
  onRemove,
}: {
  row: MyFavoriteRow;
  onRemove: (apparelId: number) => void;
}) {
  const hasPrice = row.minPriceJpy > 0;
  return (
    <div className="pack-grid-card" style={{ borderTop: '4px solid var(--pur)' }}>
      <Link
        href={`/cards/snkrdunk/${row.snkrdunkApparelId}`}
        style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
      >
        <div style={{ aspectRatio: '63 / 88', background: 'var(--pap2)', overflow: 'hidden' }}>
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.imageUrl}
              alt={row.name ?? ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
              <span style={{ fontSize: 37 }}>🃏</span>
            </div>
          )}
        </div>
        <div style={{ padding: '7px 8px 4px', borderTop: '3px solid var(--ink)' }}>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 10,
              letterSpacing: 0.2,
              marginBottom: 4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 30,
              lineHeight: 1.45,
              wordBreak: 'keep-all',
            }}
          >
            {row.name ?? '(이름 없음)'}
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '3px 6px',
              background: hasPrice ? 'var(--ink)' : 'var(--pap2)',
              color: hasPrice ? 'var(--gold)' : 'var(--ink3)',
              fontFamily: 'var(--f1)',
              fontSize: 11,
              letterSpacing: 0.3,
              boxShadow:
                '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
            }}
          >
            {hasPrice ? `¥${row.minPriceJpy.toLocaleString('ja-JP')}` : '시세 없음'}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onRemove(row.snkrdunkApparelId)}
        style={{
          width: '100%',
          padding: '6px 0',
          background: 'var(--white)',
          color: 'var(--red)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          letterSpacing: 0.3,
          border: 0,
          borderTop: '3px solid var(--ink)',
          cursor: 'pointer',
        }}
      >
        ✕ 제거
      </button>
    </div>
  );
}
