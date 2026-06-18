'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useCurrency } from '@/components/CurrencyProvider';
import { usePriceMode } from '@/components/PriceModeProvider';
import { Panel } from '@/components/ui/Panel';

interface HistPoint {
  date: string;
  totalJpy: number;
}

interface PortfolioData {
  totalJpy: number;
  totalPsa10Jpy: number;
  pricedCount: number;
  totalCount: number;
  changeAbsJpy: number | null;
  changePct: number | null;
  history: HistPoint[];
  asOfDate?: string;
}

interface CardRow {
  id: number;
  cardId: string | null;
  snkrdunkApparelId: number | null;
  nickname: string | null;
  photoUrl: string | null;
  snkrdunkName: string | null;
  snkrdunkImageUrl: string | null;
  priceSingleJpy: number;
  pricePsa10Jpy: number;
  trend: number[];
  buyPrice: number | null;
  buyCurrency: string | null;
  qty: number;
  buyDate: string | null;
  createdAt: string;
  selfPulled: boolean;
  graded: boolean;
  gradeCompany: string | null;
  gradeValue: string | null;
  ocrSetCode: string | null;
  ocrCardNumber: string | null;
}

// KR 관례: 상승=빨강, 하락=파랑.
const UP = 'var(--red)';
const DOWN = 'var(--blu)';
// 도넛/순위 색 (구성·시리즈 준비 중 placeholder 용).
const PIE = ['var(--pur)', 'var(--blu)', 'var(--gold)'];

type SortKey = 'value' | 'recent' | 'name' | 'change';
type View = 'grid' | 'list';

function cardName(c: CardRow): string {
  return c.snkrdunkName || c.nickname || '이름 미상';
}
function cardSub(c: CardRow): string {
  if (c.graded) return `${c.gradeCompany ?? 'PSA'} ${c.gradeValue ?? ''}`.trim();
  if (c.ocrSetCode) return [c.ocrSetCode.toUpperCase(), c.ocrCardNumber].filter(Boolean).join(' · ');
  return c.selfPulled ? '직접뽑기' : '싱글카드';
}

export function PortfolioScreen() {
  const { format, rate, mode, setMode } = useCurrency();
  const { mode: priceMode } = usePriceMode();
  const [port, setPort] = useState<PortfolioData | null>(null);
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [alertCount, setAlertCount] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [sort, setSort] = useState<SortKey>('value');
  const [view, setView] = useState<View>('grid');

  useEffect(() => {
    let alive = true;
    // 스니덩크 라이브 스크래핑이 느리면 응답이 안 와 스피너가 영원히 남는다. 20초 타임아웃.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    setErr(null);
    setPort(null);
    setCards(null);
    (async () => {
      try {
        const [pr, cr, ar] = await Promise.all([
          fetch('/api/me/portfolio', { credentials: 'include', cache: 'no-store', signal: ctrl.signal }),
          fetch('/api/me/cards/with-prices', { credentials: 'include', cache: 'no-store', signal: ctrl.signal }),
          fetch('/api/me/price-alerts', { credentials: 'include', cache: 'no-store', signal: ctrl.signal }).catch(() => null),
        ]);
        if (!alive) return;
        if (!pr.ok) {
          setErr(pr.status === 401 ? '로그인이 필요해요' : '포트폴리오를 불러오지 못했어요');
          return;
        }
        const pj = (await pr.json().catch(() => null)) as { data?: PortfolioData } | null;
        const cj = (await cr.json().catch(() => null)) as { data?: CardRow[] } | null;
        if (!alive) return;
        if (!pj?.data) {
          setErr('포트폴리오를 불러오지 못했어요');
          return;
        }
        setPort(pj.data);
        setCards(cj?.data ?? []);
        if (ar && ar.ok) {
          const aj = (await ar.json().catch(() => null)) as { data?: Array<{ triggeredAt: string | null }> } | null;
          setAlertCount((aj?.data ?? []).filter((a) => !a.triggeredAt).length);
        }
      } catch {
        if (alive) setErr('시세 조회가 지연되고 있어요. 잠시 후 다시 시도해주세요');
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [reload]);

  const usePsa10 = priceMode === 'psa10';

  const allRows = useMemo(() => {
    if (!cards) return [];
    return cards.map((c) => {
      const curJpy = usePsa10 && c.pricePsa10Jpy > 0 ? c.pricePsa10Jpy : c.priceSingleJpy;
      const qty = Math.max(1, c.qty || 1);
      const basisJpy =
        c.buyPrice != null && c.buyPrice > 0
          ? c.buyCurrency === 'JPY'
            ? c.buyPrice
            : c.buyPrice / (rate || 1)
          : null;
      const profitPct = basisJpy && curJpy > 0 ? ((curJpy - basisJpy) / basisJpy) * 100 : null;
      const t = c.trend ?? [];
      const dayPct =
        t.length >= 2 && t[t.length - 2] > 0 ? ((t[t.length - 1] - t[t.length - 2]) / t[t.length - 2]) * 100 : null;
      return { c, curJpy, qty, basisJpy, changePct: profitPct ?? dayPct, value: curJpy * qty };
    });
  }, [cards, usePsa10, rate]);

  const rows = useMemo(() => {
    const arr = [...allRows];
    if (sort === 'value') arr.sort((a, b) => b.value - a.value);
    else if (sort === 'change') arr.sort((a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity));
    else if (sort === 'name') arr.sort((a, b) => cardName(a.c).localeCompare(cardName(b.c), 'ko'));
    else if (sort === 'recent') arr.sort((a, b) => (b.c.createdAt || '').localeCompare(a.c.createdAt || ''));
    return arr;
  }, [allRows, sort]);

  const totals = useMemo(() => {
    let invested = 0;
    let current = 0;
    for (const r of allRows) {
      if (r.basisJpy && r.curJpy > 0) {
        invested += r.basisJpy * r.qty;
        current += r.curJpy * r.qty;
      }
    }
    const profit = current - invested;
    const pct = invested > 0 ? (profit / invested) * 100 : null;
    return { invested, current, profit, pct };
  }, [allRows]);

  const summary = useMemo(() => {
    const h = port?.history ?? [];
    const over = (days: number): { abs: number; pct: number } | null => {
      if (h.length < 2) return null;
      const last = h[h.length - 1].totalJpy;
      const base = h[Math.max(0, h.length - 1 - days)].totalJpy;
      if (!base) return null;
      return { abs: last - base, pct: ((last - base) / base) * 100 };
    };
    return { d7: over(7), d30: over(30) };
  }, [port]);

  if (err)
    return (
      <Msg>
        ⚠ {err}
        <br />
        <button type="button" onClick={() => setReload((n) => n + 1)} style={retryBtn}>
          다시 시도
        </button>
      </Msg>
    );
  if (!port || !cards) return <Msg>불러오는 중…</Msg>;
  if (port.totalCount === 0)
    return (
      <Msg>
        아직 보유 카드가 없어요.
        <br />
        <Link href="/cards/add" style={{ color: 'var(--blu)', textDecoration: 'underline' }}>
          카드 추가하러 가기 →
        </Link>
      </Msg>
    );

  const totalJpy = usePsa10 && port.totalPsa10Jpy > 0 ? port.totalPsa10Jpy : port.totalJpy;
  const up = (port.changePct ?? 0) >= 0;
  const spark = port.history.slice(-40).map((h) => h.totalJpy);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* ── 총 자산 가치 카드 (다크 히어로) ── */}
      <div style={{ padding: '4px var(--gap) 16px' }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--r-xl,16px)',
            padding: 20,
            background: 'linear-gradient(160deg,#22222a,#0e0e12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
            <span style={{ fontFamily: 'var(--f1)', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
              총 자산 가치{usePsa10 ? ' · PSA10' : ''}
            </span>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,.1)', borderRadius: 9, padding: 3 }}>
              {(['krw', 'jpy'] as const).map((m) => {
                const on = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    style={{
                      fontFamily: 'var(--f1)', fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 7,
                      border: 'none', cursor: 'pointer',
                      background: on ? '#fff' : 'transparent', color: on ? '#16161a' : 'rgba(255,255,255,.6)',
                    }}
                  >
                    {m === 'krw' ? '원화' : '엔화'}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginTop: 12 }}>
              {format(totalJpy)}
            </div>
            {port.changePct != null && (
              <div style={{ fontFamily: 'var(--f1)', fontSize: 13.5, fontWeight: 800, color: up ? '#FF6B5E' : '#6FA8FF', marginTop: 6 }}>
                {up ? '+' : '-'}{format(Math.abs(port.changeAbsJpy ?? 0))} ({up ? '+' : ''}{port.changePct.toFixed(2)}%) {up ? '▲' : '▼'}
              </div>
            )}
          </div>

          {/* 스파크라인 */}
          <Sparkline values={spark} up={up} />

          <div style={{ display: 'flex', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.12)', position: 'relative', zIndex: 2 }}>
            <HeroStat label="보유 카드" value={`${port.totalCount}장`} />
            <HeroStat label="구매 금액" value={totals.invested > 0 ? format(totals.invested) : '—'} flex={1.3} />
            <HeroStat
              label="평가 손익"
              value={totals.pct != null ? `${totals.profit >= 0 ? '+' : '-'}${format(Math.abs(totals.profit))}` : '—'}
              color={totals.pct == null ? '#fff' : totals.profit >= 0 ? '#FF6B5E' : '#6FA8FF'}
              flex={1.2}
            />
          </div>
        </div>
      </div>

      {/* ── 자산 요약 ── */}
      <Section title="자산 요약">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          <SummaryCell label="7일 변화" delta={summary.d7} format={format} />
          <SummaryCell label="30일 변화" delta={summary.d30} format={format} />
          <SummaryCell
            label="누적 수익률"
            pctOnly={totals.pct}
            sub={totals.pct != null ? `${totals.profit >= 0 ? '+' : '-'}${format(Math.abs(totals.profit))}` : undefined}
          />
        </div>
      </Section>

      {/* ── 자산 구성 (지역/시리즈 데이터 미보유 → 준비 중) ── */}
      <Section title="자산 구성">
        <Panel style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '6px 0' }}>
            <svg width="100" height="100" viewBox="0 0 118 118" style={{ flex: 'none', opacity: 0.5 }}>
              <circle cx="59" cy="59" r="42" fill="none" stroke="var(--pap3)" strokeWidth="15" />
              {PIE.map((col, i) => (
                <circle
                  key={i} cx="59" cy="59" r="42" fill="none" stroke={col} strokeWidth="15"
                  strokeDasharray={`${[120, 60, 30][i]} ${264 - [120, 60, 30][i]}`}
                  strokeDashoffset={-[0, 120, 180][i]} transform="rotate(-90 59 59)"
                />
              ))}
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 12, fontWeight: 800, color: 'var(--ink)' }}>지역·시리즈 구성</div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', marginTop: 6, lineHeight: 1.6 }}>
                카드별 지역(일본판/한국판/영문판)·시리즈 정보를 모으면 비중을 보여드려요.
                <br />🚧 준비 중
              </div>
            </div>
          </div>
        </Panel>
      </Section>

      {/* ── 가격 알림 배너 ── */}
      <div style={{ padding: '0 var(--gap) 18px' }}>
        <Panel style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ fontSize: 24, flex: 'none' }}>🎯</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>가격 알림</div>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 10.5, color: 'var(--ink3)', marginTop: 3 }}>
              원하는 카드의 가격 변동을 앱에서 알림으로 받아보세요.
            </div>
          </div>
          {alertCount > 0 && (
            <span style={{ flex: 'none', fontFamily: 'var(--f1)', fontSize: 11, fontWeight: 800, color: 'var(--orn)', whiteSpace: 'nowrap' }}>
              {alertCount}개 설정 중
            </span>
          )}
        </Panel>
      </div>

      {/* ── 내 카드 목록 ── */}
      <div style={{ padding: '0 var(--gap)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
            내 카드 목록 <span style={{ color: 'var(--ink3)' }}>({rows.length})</span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--pap2)', borderRadius: 'var(--r-sm)', padding: 3 }}>
            {(['grid', 'list'] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-label={v === 'grid' ? '그리드 보기' : '리스트 보기'}
                style={{
                  width: 30, height: 26, borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                  display: 'grid', placeItems: 'center', background: view === v ? 'var(--white)' : 'transparent',
                }}
              >
                {v === 'grid' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={view === v ? 'var(--ink)' : 'var(--ink3)'} strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={view === v ? 'var(--ink)' : 'var(--ink3)'} strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 정렬 칩 */}
        <div className="hrow" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 14 }}>
          {([
            { k: 'value', label: '가격 높은 순' },
            { k: 'change', label: '등락순' },
            { k: 'recent', label: '등록일 순' },
            { k: 'name', label: '이름 순' },
          ] as Array<{ k: SortKey; label: string }>).map((s) => {
            const on = sort === s.k;
            return (
              <button
                key={s.k}
                type="button"
                onClick={() => setSort(s.k)}
                style={{
                  flex: 'none', whiteSpace: 'nowrap', fontFamily: 'var(--f1)', fontSize: 12.5, fontWeight: 700,
                  padding: '8px 14px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  background: 'var(--white)', color: on ? 'var(--ink)' : 'var(--ink3)',
                  border: `1.5px solid ${on ? 'var(--ink)' : 'var(--pap3)'}`,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink3)' }}>
            해당 조건의 카드가 없어요
          </div>
        ) : view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 24 }}>
            {rows.map((r, i) => (
              <CardGridItem key={r.c.id} row={r} rank={i + 1} format={format} />
            ))}
          </div>
        ) : (
          <div style={{ paddingBottom: 24 }}>
            {rows.map((r, i, arr) => (
              <CardListItem key={r.c.id} row={r} format={format} last={i === arr.length - 1} />
            ))}
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', textAlign: 'center', letterSpacing: 0.3, lineHeight: 1.6, padding: '0 var(--gap)' }}>
        스니덩크 최근 체결 중앙값 기준 · 관심카드 제외 · 어제(KST 정각) 대비
      </div>
    </div>
  );
}

type Row = {
  c: CardRow;
  curJpy: number;
  qty: number;
  basisJpy: number | null;
  changePct: number | null;
  value: number;
};

function rankBadgeColor(rank: number): string {
  if (rank === 1) return 'var(--gold)';
  if (rank === 2) return '#9AA0A6';
  if (rank === 3) return '#C8732B';
  return 'var(--ink)';
}

const FALLBACK_GRADS = [
  'linear-gradient(150deg,#ff6a3d,#c81d25)',
  'linear-gradient(150deg,#f9d423,#ff8a3c)',
  'linear-gradient(150deg,#f7a6c4,#b78cf0)',
  'linear-gradient(150deg,#9d6bd6,#4568dc)',
  'linear-gradient(150deg,#3a3a44,#16161a)',
  'linear-gradient(150deg,#11998e,#38ef7d)',
];

function CardGridItem({ row, rank, format }: { row: Row; rank: number; format: (j: number) => string }) {
  const { c, curJpy, qty, changePct } = row;
  const img = c.snkrdunkImageUrl || c.photoUrl || null;
  const cu = (changePct ?? 0) >= 0;
  const href = c.snkrdunkApparelId ? `/cards/snkrdunk/${c.snkrdunkApparelId}` : undefined;
  const body = (
    <>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: img ? 'var(--pap2)' : FALLBACK_GRADS[rank % FALLBACK_GRADS.length], display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={cardName(c)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 42, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.3))' }}>🃏</span>
        )}
        <div style={{ position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: '50%', background: rankBadgeColor(rank), color: '#fff', fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,.25)' }}>
          {rank}
        </div>
      </div>
      <div style={{ padding: '10px 11px 12px' }}>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 13, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cardName(c)}
        </div>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink3)', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cardSub(c)}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
          <span style={{ fontFamily: 'var(--f1)', fontSize: 14, fontWeight: 900, color: 'var(--ink)' }}>{curJpy > 0 ? format(curJpy) : '—'}</span>
          {changePct != null && (
            <span style={{ fontFamily: 'var(--f1)', fontSize: 11.5, fontWeight: 800, color: cu ? UP : DOWN }}>
              {cu ? '+' : ''}{changePct.toFixed(1)}%
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink3)', fontWeight: 600, marginTop: 4 }}>{qty}장 보유</div>
      </div>
    </>
  );
  const boxStyle = { display: 'block', overflow: 'hidden', textDecoration: 'none', color: 'inherit' } as const;
  return href ? (
    <Panel href={href} style={boxStyle}>{body}</Panel>
  ) : (
    <Panel style={boxStyle}>{body}</Panel>
  );
}

function CardListItem({ row, format, last }: { row: Row; format: (j: number) => string; last: boolean }) {
  const { c, curJpy, qty, changePct } = row;
  const img = c.snkrdunkImageUrl || c.photoUrl || null;
  const cu = (changePct ?? 0) >= 0;
  const href = c.snkrdunkApparelId ? `/cards/snkrdunk/${c.snkrdunkApparelId}` : '#';
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 2px', borderBottom: last ? 'none' : '1px solid var(--pap3)', textDecoration: 'none', color: 'inherit' }}>
      <div style={{ width: 48, height: 48, flex: 'none', borderRadius: 'var(--r-sm)', overflow: 'hidden', background: 'var(--pap2)', display: 'grid', placeItems: 'center' }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={cardName(c)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 22 }}>🃏</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cardName(c)}</div>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{cardSub(c)}{qty > 1 ? ` · ×${qty}` : ''}</div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 14, fontWeight: 900, color: 'var(--ink)' }}>{curJpy > 0 ? format(curJpy) : '—'}</div>
        {changePct != null && (
          <div style={{ fontFamily: 'var(--f1)', fontSize: 12, fontWeight: 800, color: cu ? UP : DOWN, marginTop: 3 }}>
            {cu ? '▲' : '▼'} {cu ? '+' : ''}{changePct.toFixed(1)}%
          </div>
        )}
      </div>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '0 var(--gap) 18px' }}>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 17, fontWeight: 800, color: 'var(--ink)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function HeroStat({ label, value, color = '#fff', flex = 1 }: { label: string; value: string; color?: string; flex?: number }) {
  return (
    <div style={{ flex }}>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 11.5, color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 15, fontWeight: 800, color, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
}

function SummaryCell({
  label,
  delta,
  pctOnly,
  sub,
  format,
}: {
  label: string;
  delta?: { abs: number; pct: number } | null;
  pctOnly?: number | null;
  sub?: string;
  format?: (j: number) => string;
}) {
  const pct = delta ? delta.pct : pctOnly ?? null;
  const color = pct == null ? 'var(--ink3)' : pct >= 0 ? UP : DOWN;
  const main =
    delta && format
      ? `${delta.abs >= 0 ? '+' : '-'}${format(Math.abs(delta.abs))}`
      : pct != null
        ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
        : '—';
  const subText = delta ? `(${pct! >= 0 ? '+' : ''}${pct!.toFixed(2)}%)` : sub;
  return (
    <div style={{ border: '1px solid var(--pap3)', borderRadius: 'var(--r)', padding: '13px 12px', background: 'var(--white)', minHeight: 92 }}>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink3)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 14, fontWeight: 900, color, marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{main}</div>
      {subText && <div style={{ fontFamily: 'var(--f1)', fontSize: 10.5, color: 'var(--ink3)', fontWeight: 700, marginTop: 3 }}>{subText}</div>}
    </div>
  );
}

/** 다크 히어로용 스파크라인(우하단 배경). */
function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const pts = values.filter((n) => typeof n === 'number' && n > 0);
  if (pts.length < 2) return null;
  const W = 240;
  const H = 80;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = Math.max(1, max - min);
  const step = W / (pts.length - 1);
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(H - ((v - min) / span) * (H - 8) - 4).toFixed(1)}`).join(' ');
  const col = up ? '#FF5247' : '#5A9BFF';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute', right: 0, top: 64, width: 200, height: 80, zIndex: 1 }}>
      <defs>
        <linearGradient id="pfTotArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.45" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#pfTotArea)" />
      <path d={line} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Msg({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', fontFamily: 'var(--f1)', fontSize: 13, color: 'var(--ink3)', lineHeight: 1.8 }}>
      {children}
    </div>
  );
}

const retryBtn: React.CSSProperties = {
  marginTop: 12,
  padding: '8px 18px',
  background: 'transparent',
  color: 'var(--blu)',
  border: '1px solid var(--blu)',
  borderRadius: 'var(--r-sm)',
  cursor: 'pointer',
  font: 'inherit',
};
