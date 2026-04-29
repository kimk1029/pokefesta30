import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

interface SearchParams {
  page?: string;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const page = parseIntParam(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [users, total, agg] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ points: 'desc' }, { createdAt: 'asc' }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, email: true, avatarId: true, points: true, createdAt: true,
      },
    }),
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { points: true }, _avg: { points: true }, _max: { points: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totalPoints = agg._sum.points ?? 0;
  const avgPoints = Math.round(agg._avg.points ?? 0);
  const maxPoints = agg._max.points ?? 0;

  return (
    <>
      <h1 className="admin-h1">포인트 랭킹</h1>
      <p className="admin-sub">
        총 {total.toLocaleString()}명 · {page} / {totalPages} 페이지
      </p>

      <div className="grid-stats">
        <Stat label="총 보유 포인트" value={totalPoints} />
        <Stat label="평균" value={avgPoints} />
        <Stat label="최고" value={maxPoints} />
        <Stat label="회원 수" value={total} />
      </div>

      {users.length === 0 ? (
        <div className="empty">회원이 없습니다.</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ textAlign: 'right', width: 60 }}>순위</th>
              <th>UID</th>
              <th>이름</th>
              <th>이메일</th>
              <th>아바타</th>
              <th style={{ textAlign: 'right' }}>포인트</th>
              <th>가입</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const rank = skip + i + 1;
              return (
                <tr key={u.id}>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {rankBadge(rank)}
                  </td>
                  <td className="mono" style={{ fontSize: 10, color: '#64748B', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.id}>
                    {u.id.slice(0, 12)}
                  </td>
                  <td>{u.name}</td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {u.email ?? <span className="muted">-</span>}
                  </td>
                  <td className="mono">{u.avatarId}</td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {u.points.toLocaleString()}
                  </td>
                  <td className="mono muted">{fmtDate(u.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Pager base="/ranking" page={page} totalPages={totalPages} />
    </>
  );
}

function rankBadge(rank: number): React.ReactNode {
  if (rank === 1) return <span title="1위">🥇 1</span>;
  if (rank === 2) return <span title="2위">🥈 2</span>;
  if (rank === 3) return <span title="3위">🥉 3</span>;
  return rank;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="lbl">{label}</div>
      <div className="val">{value.toLocaleString()}</div>
    </div>
  );
}

function Pager({ base, page, totalPages }: { base: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pager">
      {page > 1 ? <Link href={`${base}?page=${page - 1}`}>← 이전</Link> : <span className="disabled">← 이전</span>}
      <span className="disabled">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={`${base}?page=${page + 1}`}>다음 →</Link> : <span className="disabled">다음 →</span>}
    </div>
  );
}
