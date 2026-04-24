import Link from 'next/link';
import { DeleteFeedButton } from '@/components/DeleteFeedButton';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam, trunc } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

interface SearchParams {
  kind?: string;
  q?: string;
  page?: string;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const kind = searchParams.kind === 'report' || searchParams.kind === 'general' ? searchParams.kind : null;
  const q = (searchParams.q ?? '').trim();
  const page = parseIntParam(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(kind ? { kind } : {}),
    ...(q ? { text: { contains: q, mode: 'insensitive' as const } } : {}),
  };

  const [feeds, total] = await Promise.all([
    prisma.feed.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        place: { select: { name: true } },
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.feed.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1 className="admin-h1">피드 관리</h1>
      <p className="admin-sub">
        총 {total.toLocaleString()}건 · {page} / {totalPages} 페이지
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <FilterLink href="/feeds" on={!kind}>전체</FilterLink>
        <FilterLink href="/feeds?kind=general" on={kind === 'general'}>일반</FilterLink>
        <FilterLink href="/feeds?kind=report" on={kind === 'report'}>제보</FilterLink>
      </div>

      <form className="search" method="get">
        {kind && <input type="hidden" name="kind" value={kind} />}
        <input name="q" placeholder="본문 검색" defaultValue={q} />
        <button type="submit">검색</button>
      </form>

      {feeds.length === 0 ? (
        <div className="empty">결과 없음</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>종류</th>
              <th>본문</th>
              <th>장소</th>
              <th>작성자</th>
              <th>시각</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((f) => (
              <tr key={f.id}>
                <td className="mono">{f.id}</td>
                <td>
                  <span className={`tag ${f.kind === 'report' ? 'tag-report' : 'tag-general'}`}>{f.kind}</span>
                </td>
                <td>{trunc(f.text, 60)}</td>
                <td className="muted">{f.place?.name ?? '-'}</td>
                <td>{f.author?.name ?? <span className="muted">(탈퇴/익명)</span>}</td>
                <td className="mono muted">{fmtDate(f.createdAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  <DeleteFeedButton id={f.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager base="/feeds" kind={kind} q={q} page={page} totalPages={totalPages} />
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
  base, kind, q, page, totalPages,
}: { base: string; kind: string | null; q: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const params = new URLSearchParams();
  if (kind) params.set('kind', kind);
  if (q) params.set('q', q);
  const mk = (p: number) => {
    const c = new URLSearchParams(params);
    c.set('page', String(p));
    return `${base}?${c.toString()}`;
  };
  return (
    <div className="pager">
      {page > 1 ? <Link href={mk(page - 1)}>← 이전</Link> : <span className="disabled">← 이전</span>}
      <span className="disabled">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={mk(page + 1)}>다음 →</Link> : <span className="disabled">다음 →</span>}
    </div>
  );
}
