import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam, trunc } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

interface SearchParams {
  status?: string;
  type?: string;
  q?: string;
  page?: string;
}

const STATUSES = ['open', 'reserved', 'done', 'cancelled'] as const;
const TYPES = ['sell', 'buy', 'swap'] as const;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const status = STATUSES.includes(searchParams.status as (typeof STATUSES)[number])
    ? (searchParams.status as string) : null;
  const type = TYPES.includes(searchParams.type as (typeof TYPES)[number])
    ? (searchParams.type as string) : null;
  const q = (searchParams.q ?? '').trim();
  const page = parseIntParam(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        place: { select: { name: true } },
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.trade.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1 className="admin-h1">거래 관리</h1>
      <p className="admin-sub">
        {total.toLocaleString()}건 · {page} / {totalPages}
      </p>

      <form className="search" method="get">
        {status && <input type="hidden" name="status" value={status} />}
        {type && <input type="hidden" name="type" value={type} />}
        <input name="q" placeholder="제목 검색" defaultValue={q} />
        <button type="submit">검색</button>
      </form>

      {rows.length === 0 ? (
        <div className="empty">결과 없음</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>유형</th>
              <th>상태</th>
              <th>제목</th>
              <th>장소</th>
              <th>작성자</th>
              <th>가격</th>
              <th>생성</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.id}</td>
                <td><span className="tag">{t.type}</span></td>
                <td>
                  <span className={`tag ${t.status === 'done' ? 'tag-done' : 'tag-open'}`}>
                    {t.status}
                  </span>
                </td>
                <td>{trunc(t.title, 50)}</td>
                <td className="muted">{t.place?.name ?? '-'}</td>
                <td>{t.author?.name ?? <span className="muted">-</span>}</td>
                <td className="mono">{t.price ?? '-'}</td>
                <td className="mono muted">{fmtDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
