import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam, trunc } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

interface SearchParams {
  page?: string;
  unread?: string;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const page = parseIntParam(searchParams.page, 1);
  const unreadOnly = searchParams.unread === '1';
  const skip = (page - 1) * PAGE_SIZE;

  const where = unreadOnly ? { readAt: null } : {};

  const [rows, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
    }),
    prisma.message.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1 className="admin-h1">쪽지 목록</h1>
      <p className="admin-sub">
        전체 쪽지 {total.toLocaleString()}건 · {page} / {totalPages}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <FilterLink href="/messages" on={!unreadOnly}>전체</FilterLink>
        <FilterLink href="/messages?unread=1" on={unreadOnly}>미읽음만</FilterLink>
      </div>

      {rows.length === 0 ? (
        <div className="empty">없음</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>보낸이</th>
              <th>받는이</th>
              <th>본문</th>
              <th>거래</th>
              <th>읽음</th>
              <th>시각</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.id}</td>
                <td>{m.sender?.name ?? <span className="muted">-</span>}</td>
                <td>{m.receiver?.name ?? <span className="muted">-</span>}</td>
                <td>{trunc(m.text, 60)}</td>
                <td className="mono muted">{m.tradeId ?? '-'}</td>
                <td>{m.readAt ? <span className="tag tag-done">read</span> : <span className="tag tag-open">unread</span>}</td>
                <td className="mono muted">{fmtDate(m.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager base="/messages" unreadOnly={unreadOnly} page={page} totalPages={totalPages} />
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
  base, unreadOnly, page, totalPages,
}: { base: string; unreadOnly: boolean; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const qs = unreadOnly ? '&unread=1' : '';
  return (
    <div className="pager">
      {page > 1 ? <Link href={`${base}?page=${page - 1}${qs}`}>← 이전</Link> : <span className="disabled">← 이전</span>}
      <span className="disabled">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={`${base}?page=${page + 1}${qs}`}>다음 →</Link> : <span className="disabled">다음 →</span>}
    </div>
  );
}
