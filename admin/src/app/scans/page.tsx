import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam, trunc } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

interface SearchParams {
  engine?: string;
  source?: string;
  fail?: string;
  page?: string;
}

const ENGINE_LABEL: Record<string, string> = {
  vision: 'OpenAI Vision',
  paddle: 'PaddleOCR',
  none: '실패',
};

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const engine =
    searchParams.engine === 'vision' || searchParams.engine === 'paddle' || searchParams.engine === 'none'
      ? searchParams.engine
      : null;
  const source = searchParams.source === 'web' || searchParams.source === 'app' ? searchParams.source : null;
  const failOnly = searchParams.fail === '1';
  const page = parseIntParam(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(engine ? { engine } : {}),
    ...(source ? { source } : {}),
    ...(failOnly ? { success: false } : {}),
  };

  const [rows, total, failTotal, tokenAgg] = await Promise.all([
    prisma.scanLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.scanLog.count({ where }),
    prisma.scanLog.count({
      where: {
        ...(engine ? { engine } : {}),
        ...(source ? { source } : {}),
        success: false,
      },
    }),
    prisma.scanLog.aggregate({ where, _sum: { totalTokens: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totalTokens = tokenAgg._sum.totalTokens ?? 0;

  const mkHref = (over: Partial<SearchParams>) => {
    const c = new URLSearchParams();
    const merged: SearchParams = {
      engine: engine ?? '',
      source: source ?? '',
      fail: failOnly ? '1' : '',
      ...over,
    };
    if (merged.engine) c.set('engine', merged.engine);
    if (merged.source) c.set('source', merged.source);
    if (merged.fail === '1') c.set('fail', '1');
    const qs = c.toString();
    return qs ? `/scans?${qs}` : '/scans';
  };

  return (
    <>
      <h1 className="admin-h1">스캔 로그</h1>
      <p className="admin-sub">
        총 {total.toLocaleString()}건 · {page} / {totalPages} 페이지 — 어떤 엔진·모델로 요청했고 무엇을 인식했는지
        {totalTokens > 0 && <> · 누적 토큰 {totalTokens.toLocaleString()}</>}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <FilterLink href={mkHref({ engine: '' })} on={!engine}>전체 엔진</FilterLink>
        <FilterLink href={mkHref({ engine: 'vision' })} on={engine === 'vision'}>Vision</FilterLink>
        <FilterLink href={mkHref({ engine: 'paddle' })} on={engine === 'paddle'}>Paddle</FilterLink>
        <FilterLink href={mkHref({ engine: 'none' })} on={engine === 'none'}>실패</FilterLink>
        <span style={{ width: 1, background: '#E2E8F0', margin: '0 4px' }} />
        <FilterLink href={mkHref({ source: '' })} on={!source}>전체</FilterLink>
        <FilterLink href={mkHref({ source: 'app' })} on={source === 'app'}>앱</FilterLink>
        <FilterLink href={mkHref({ source: 'web' })} on={source === 'web'}>웹</FilterLink>
        <span style={{ width: 1, background: '#E2E8F0', margin: '0 4px' }} />
        <FilterLink href={mkHref({ fail: failOnly ? '' : '1' })} on={failOnly}>
          결과 없음만 ({failTotal.toLocaleString()})
        </FilterLink>
      </div>

      {rows.length === 0 ? (
        <div className="empty">결과 없음</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>엔진 / 모델</th>
              <th>인식 결과</th>
              <th>후보</th>
              <th>토큰</th>
              <th>소요</th>
              <th>스캔한 사람</th>
              <th>출처</th>
              <th>시각</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ex = (r.extracted ?? null) as null | {
                name?: string;
                setCode?: string;
                cardNumber?: string;
                totalNumber?: string;
                rarity?: string;
              };
              const exLabel = ex
                ? [
                    ex.name,
                    ex.setCode && `${ex.setCode} ${ex.cardNumber ?? ''}${ex.totalNumber ? '/' + ex.totalNumber : ''}`.trim(),
                    ex.rarity,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : '';
              return (
                <tr key={r.id}>
                  <td className="mono">
                    <Link href={`/scans/${r.id}`}>{r.id}</Link>
                  </td>
                  <td>
                    <span className="tag" style={engineStyle(r.engine)}>{ENGINE_LABEL[r.engine] ?? r.engine}</span>
                    {r.model && <div className="mono muted" style={{ fontSize: 11 }}>{r.model}</div>}
                  </td>
                  <td>
                    {exLabel ? (
                      <Link href={`/scans/${r.id}`}>{trunc(exLabel, 48)}</Link>
                    ) : (
                      <span className="muted">{r.errorMessage ? trunc(r.errorMessage, 40) : '—'}</span>
                    )}
                  </td>
                  <td
                    className="mono"
                    style={r.success ? undefined : { color: '#DC2626', fontWeight: 700 }}
                  >
                    {r.candidateCount}
                  </td>
                  <td className="mono muted">{r.totalTokens ? r.totalTokens.toLocaleString() : '—'}</td>
                  <td className="mono muted">{r.durationMs.toLocaleString()}ms</td>
                  <td>
                    {r.user ? (
                      <Link href={`/users?q=${encodeURIComponent(r.user.id)}`}>
                        {r.user.name ?? r.user.email ?? r.user.id}
                      </Link>
                    ) : (
                      <span className="muted">익명</span>
                    )}
                  </td>
                  <td><span className="tag">{r.source === 'app' ? '앱' : '웹'}</span></td>
                  <td className="mono muted">{fmtDate(r.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Pager engine={engine} source={source} fail={failOnly} page={page} totalPages={totalPages} />
    </>
  );
}

function engineStyle(engine: string): React.CSSProperties {
  if (engine === 'vision') return { background: '#DBEAFE', color: '#1D4ED8' };
  if (engine === 'paddle') return { background: '#DCFCE7', color: '#15803D' };
  return { background: '#FEE2E2', color: '#B91C1C' };
}

function FilterLink({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: '6px 14px',
        fontSize: 12,
        border: '1px solid #CBD5E1',
        borderRadius: 5,
        background: on ? '#3B82F6' : '#fff',
        color: on ? '#fff' : '#334155',
      }}
    >
      {children}
    </Link>
  );
}

function Pager({
  engine, source, fail, page, totalPages,
}: { engine: string | null; source: string | null; fail: boolean; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const mk = (p: number) => {
    const c = new URLSearchParams();
    if (engine) c.set('engine', engine);
    if (source) c.set('source', source);
    if (fail) c.set('fail', '1');
    c.set('page', String(p));
    return `/scans?${c.toString()}`;
  };
  return (
    <div className="pager">
      {page > 1 ? <Link href={mk(page - 1)}>← 이전</Link> : <span className="disabled">← 이전</span>}
      <span className="disabled">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={mk(page + 1)}>다음 →</Link> : <span className="disabled">다음 →</span>}
    </div>
  );
}
