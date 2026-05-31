import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam, trunc } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

interface SearchParams {
  q?: string;
  source?: string;
  zero?: string;
  page?: string;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q ?? '').trim();
  const source = searchParams.source === 'web' || searchParams.source === 'mobile' ? searchParams.source : null;
  const zeroOnly = searchParams.zero === '1';
  const page = parseIntParam(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(q ? { query: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(source ? { source } : {}),
    ...(zeroOnly ? { resultCount: 0 } : {}),
  };

  const [rows, total, zeroTotal] = await Promise.all([
    prisma.searchLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.searchLog.count({ where }),
    prisma.searchLog.count({
      where: {
        ...(q ? { query: { contains: q, mode: 'insensitive' as const } } : {}),
        ...(source ? { source } : {}),
        resultCount: 0,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 현재 필터를 유지하며 일부만 바꾼 링크 생성
  const mkHref = (over: Partial<SearchParams>) => {
    const c = new URLSearchParams();
    const merged: SearchParams = { q, source: source ?? '', zero: zeroOnly ? '1' : '', ...over };
    if (merged.q) c.set('q', merged.q);
    if (merged.source) c.set('source', merged.source);
    if (merged.zero === '1') c.set('zero', '1');
    const qs = c.toString();
    return qs ? `/searches?${qs}` : '/searches';
  };

  return (
    <>
      <h1 className="admin-h1">검색 로그</h1>
      <p className="admin-sub">
        총 {total.toLocaleString()}건 · {page} / {totalPages} 페이지 — 어떤 키워드를 누가 검색했고 결과가 몇 건이었는지
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <FilterLink href={mkHref({ source: '' })} on={!source}>전체</FilterLink>
        <FilterLink href={mkHref({ source: 'mobile' })} on={source === 'mobile'}>앱</FilterLink>
        <FilterLink href={mkHref({ source: 'web' })} on={source === 'web'}>웹</FilterLink>
        <span style={{ width: 1, background: '#E2E8F0', margin: '0 4px' }} />
        <FilterLink href={mkHref({ zero: zeroOnly ? '' : '1' })} on={zeroOnly}>
          결과 0건만 ({zeroTotal.toLocaleString()})
        </FilterLink>
      </div>

      <form className="search" method="get">
        {source && <input type="hidden" name="source" value={source} />}
        {zeroOnly && <input type="hidden" name="zero" value="1" />}
        <input name="q" placeholder="검색어로 필터" defaultValue={q} />
        <button type="submit">검색</button>
      </form>

      {rows.length === 0 ? (
        <div className="empty">결과 없음</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>검색어</th>
              <th>결과수</th>
              <th>검색자</th>
              <th>출처</th>
              <th>시각</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td><b>{trunc(r.query, 40)}</b></td>
                <td className="mono" style={r.resultCount === 0 ? { color: '#DC2626', fontWeight: 700 } : undefined}>
                  {r.resultCount.toLocaleString()}
                </td>
                <td>
                  {r.user ? (
                    <Link href={`/users?q=${encodeURIComponent(r.user.id)}`}>
                      {r.user.name ?? r.user.email ?? r.user.id}
                    </Link>
                  ) : (
                    <span className="muted">익명</span>
                  )}
                </td>
                <td><span className="tag">{r.source === 'mobile' ? '앱' : '웹'}</span></td>
                <td className="mono muted">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager q={q} source={source} zero={zeroOnly} page={page} totalPages={totalPages} />
    </>
  );
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
  q, source, zero, page, totalPages,
}: { q: string; source: string | null; zero: boolean; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const mk = (p: number) => {
    const c = new URLSearchParams();
    if (q) c.set('q', q);
    if (source) c.set('source', source);
    if (zero) c.set('zero', '1');
    c.set('page', String(p));
    return `/searches?${c.toString()}`;
  };
  return (
    <div className="pager">
      {page > 1 ? <Link href={mk(page - 1)}>← 이전</Link> : <span className="disabled">← 이전</span>}
      <span className="disabled">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={mk(page + 1)}>다음 →</Link> : <span className="disabled">다음 →</span>}
    </div>
  );
}
