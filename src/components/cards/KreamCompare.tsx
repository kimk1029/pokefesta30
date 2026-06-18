'use client';

import { useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { useCurrency } from '@/components/CurrencyProvider';

/**
 * 시세 비교 — SNKRDUNK(엔화) vs KREAM(원화)를 원화로 환산해 나란히 보여준다.
 * KREAM 은 이름으로 검색해(스크래핑·캐시·플레이키) 최적 매칭의 즉시판매가만 제공하므로
 * 1개 가격 비교. 실패/매칭 없으면 "KREAM 에서 검색" 이동 버튼으로 폴백.
 */

interface KreamItem {
  id: string;
  name: string;
  price: number; // KRW
  imageUrl: string | null;
  productUrl: string;
}

interface Props {
  /** 검색어(카드 한글명). */
  query: string;
  /** SNKRDUNK 비교 기준가 (JPY). 보통 RAW 최근 거래가. */
  snkrPriceJpy: number;
}

function fmtKrw(v: number): string {
  if (!v || v <= 0) return '—';
  return `₩${Math.round(v).toLocaleString('ko-KR')}`;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/** 검색 결과에서 카드명과 가장 잘 맞는 항목 선택(토큰 포함 수). 없으면 첫 결과. */
function bestMatch(items: KreamItem[], query: string): KreamItem | null {
  if (items.length === 0) return null;
  const tokens = query.split(/\s+/).filter((t) => t.length >= 2);
  let best = items[0];
  let bestScore = -1;
  for (const it of items) {
    const n = norm(it.name);
    let score = 0;
    for (const t of tokens) if (n.includes(norm(t))) score += 1;
    if (it.price > 0) score += 0.5; // 가격 있는 매물 우대
    if (score > bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return best;
}

export function KreamCompare({ query, snkrPriceJpy }: Props) {
  const { rate } = useCurrency();
  const [state, setState] = useState<'loading' | 'done'>('loading');
  const [item, setItem] = useState<KreamItem | null>(null);

  useEffect(() => {
    let alive = true;
    setState('loading');
    (async () => {
      try {
        const r = await fetch(`/api/kream/search?q=${encodeURIComponent(query)}`);
        const j = (await r.json()) as { items?: KreamItem[] };
        if (!alive) return;
        setItem(bestMatch(j.items ?? [], query));
      } catch {
        if (alive) setItem(null);
      } finally {
        if (alive) setState('done');
      }
    })();
    return () => {
      alive = false;
    };
  }, [query]);

  const searchUrl = `https://kream.co.kr/search?keyword=${encodeURIComponent(query)}`;
  const snkrKrw = snkrPriceJpy > 0 ? snkrPriceJpy * rate : 0;
  const kreamKrw = item?.price ?? 0;

  const cmp = useMemo(() => {
    if (snkrKrw <= 0 || kreamKrw <= 0) return null;
    const diff = kreamKrw - snkrKrw;
    const cheaper = diff > 0 ? 'snkr' : diff < 0 ? 'kream' : 'same';
    const pct = Math.abs(diff) / Math.min(snkrKrw, kreamKrw) * 100;
    return { diff, cheaper, pct };
  }, [snkrKrw, kreamKrw]);

  return (
    <div className="sect">
      <div className="sect-hd">
        <h2>시세 비교</h2>
        <span className="more">SNKRDUNK vs 크림</span>
      </div>
      <Panel style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
          {/* SNKRDUNK */}
          <Col
            name="SNKRDUNK"
            sub="최근 거래가(엔화 환산)"
            price={fmtKrw(snkrKrw)}
            highlight={cmp?.cheaper === 'snkr'}
          />
          <div style={{ width: 1, background: 'var(--pap3)', flex: 'none' }} />
          {/* KREAM */}
          <Col
            name="크림 KREAM"
            sub="즉시판매가"
            price={state === 'loading' ? '조회 중…' : fmtKrw(kreamKrw)}
            highlight={cmp?.cheaper === 'kream'}
            href={item?.productUrl}
          />
        </div>

        {/* 차이 요약 */}
        {cmp && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--pap2)',
              fontFamily: 'var(--f1)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--ink)',
              textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            {cmp.cheaper === 'same' ? (
              '두 플랫폼 시세가 비슷해요'
            ) : (
              <>
                <span style={{ color: cmp.cheaper === 'snkr' ? 'var(--blu)' : 'var(--red)' }}>
                  {cmp.cheaper === 'snkr' ? 'SNKRDUNK' : '크림'}
                </span>
                {' 이 '}
                <span style={{ color: 'var(--red)' }}>{fmtKrw(Math.abs(cmp.diff))}</span>
                {` 저렴 (${cmp.pct.toFixed(1)}%)`}
              </>
            )}
          </div>
        )}

        {/* 매칭 정보 / 폴백 */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {state === 'loading'
              ? '크림 시세 조회 중…'
              : item
                ? `크림 매칭: ${item.name}`
                : '크림에서 일치하는 상품을 찾지 못했어요'}
          </span>
          <a
            href={item?.productUrl ?? searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flex: 'none', fontFamily: 'var(--f1)', fontSize: 10, fontWeight: 700, color: 'var(--blu)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            크림에서 보기 ↗
          </a>
        </div>
        <div style={{ marginTop: 8, fontFamily: 'var(--f1)', fontSize: 8.5, color: 'var(--ink3)', letterSpacing: 0.2, lineHeight: 1.5 }}>
          · 이베이·메루카리·야후옥션 비교는 준비 중이에요.
        </div>
      </Panel>
    </div>
  );
}

function Col({
  name,
  sub,
  price,
  highlight,
  href,
}: {
  name: string;
  sub: string;
  price: string;
  highlight?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 11, fontWeight: 800, color: 'var(--ink)' }}>{name}</div>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginTop: 3 }}>{sub}</div>
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 17,
          fontWeight: 900,
          color: highlight ? 'var(--red)' : 'var(--ink)',
          marginTop: 8,
          letterSpacing: 0.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {price}
      </div>
      {highlight && (
        <div style={{ marginTop: 5, display: 'inline-block', fontFamily: 'var(--f1)', fontSize: 8, fontWeight: 800, color: 'var(--white)', background: 'var(--red)', padding: '2px 6px', borderRadius: 'var(--r-sm)' }}>
          최저
        </div>
      )}
    </>
  );
  const style = { flex: 1, minWidth: 0 } as const;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ ...style, textDecoration: 'none', color: 'inherit' }}>
      {inner}
    </a>
  ) : (
    <div style={style}>{inner}</div>
  );
}
