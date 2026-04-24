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
        updatedAt: true,
        _count: {
          select: {
            feeds: true,
            trades: true,
            bookmarks: true,
            sentMessages: true,
            receivedMessages: true,
            oripaTickets: true,
          },
        },
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
              <th>이름</th>
              <th>아바타</th>
              <th style={{ textAlign: 'right' }}>포인트</th>
              <th style={{ textAlign: 'right' }}>피드</th>
              <th style={{ textAlign: 'right' }}>거래</th>
              <th style={{ textAlign: 'right' }}>찜</th>
              <th style={{ textAlign: 'right' }}>쪽지</th>
              <th style={{ textAlign: 'right' }}>오리파</th>
              <th>가입</th>
              <th>마지막 활동</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td className="mono">{u.avatarId}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{u.points.toLocaleString()}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{u._count.feeds}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{u._count.trades}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{u._count.bookmarks}</td>
                <td className="mono" style={{ textAlign: 'right' }}>
                  {u._count.sentMessages + u._count.receivedMessages}
                </td>
                <td className="mono" style={{ textAlign: 'right' }}>{u._count.oripaTickets}</td>
                <td className="mono muted">{fmtDate(u.createdAt)}</td>
                <td className="mono muted">{fmtDate(u.updatedAt)}</td>
                <td>
                  <Link href={`/users/${u.id}`} className="btn">상세</Link>
                </td>
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
