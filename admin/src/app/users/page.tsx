import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

interface SearchParams {
  q?: string;
  page?: string;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q ?? '').trim();
  const page = parseIntParam(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { id: q }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        avatarId: true,
        points: true,
        createdAt: true,
        _count: { select: { feeds: true, trades: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1 className="admin-h1">회원 관리</h1>
      <p className="admin-sub">
        총 {total.toLocaleString()}명 · {page} / {totalPages} 페이지
      </p>

      <form className="search" method="get">
        <input name="q" placeholder="이름 또는 ID 검색" defaultValue={q} />
        <button type="submit">검색</button>
      </form>

      {users.length === 0 ? (
        <div className="empty">검색 결과가 없습니다.</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>이름</th>
              <th>아바타</th>
              <th>포인트</th>
              <th>피드</th>
              <th>거래</th>
              <th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="mono" style={{ fontSize: 11, color: '#64748B' }}>
                  {u.id.slice(0, 12)}
                </td>
                <td>{u.name}</td>
                <td className="mono">{u.avatarId}</td>
                <td className="mono">{u.points.toLocaleString()}</td>
                <td className="mono">{u._count.feeds}</td>
                <td className="mono">{u._count.trades}</td>
                <td className="mono muted">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager base="/users" q={q} page={page} totalPages={totalPages} />
    </>
  );
}

function Pager({ base, q, page, totalPages }: { base: string; q: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const qStr = q ? `&q=${encodeURIComponent(q)}` : '';
  return (
    <div className="pager">
      {page > 1 ? <Link href={`${base}?page=${page - 1}${qStr}`}>← 이전</Link> : <span className="disabled">← 이전</span>}
      <span className="disabled">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={`${base}?page=${page + 1}${qStr}`}>다음 →</Link> : <span className="disabled">다음 →</span>}
    </div>
  );
}
