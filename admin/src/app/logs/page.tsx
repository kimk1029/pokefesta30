import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

interface SearchParams {
  uid?: string;
  only?: string;
  page?: string;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const uid = (searchParams.uid ?? '').trim();
  const onlyLoggedIn = searchParams.only === 'auth' || !searchParams.only; // 기본: 로그인 사용자만
  const page = parseIntParam(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(uid ? { userId: uid } : onlyLoggedIn ? { userId: { not: null } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.pageView.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true, path: true, ip: true, country: true,
        userId: true, referer: true, createdAt: true,
      },
    }).catch(() => []),
    prisma.pageView.count({ where }).catch(() => 0),
  ]);

  const userIds = Array.from(new Set(rows.map((r) => r.userId).filter((x): x is string => !!x)));
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }).catch(() => [])
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1 className="admin-h1">사용자 활동 로그</h1>
      <p className="admin-sub">
        방문/클릭 기록 시간순 · 총 {total.toLocaleString()}건 · {page} / {totalPages}
      </p>

      <form className="search" method="get">
        <input name="uid" placeholder="특정 UID 로 필터" defaultValue={uid} />
        <select name="only" defaultValue={onlyLoggedIn ? 'auth' : 'all'} style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 5 }}>
          <option value="auth">로그인 유저만</option>
          <option value="all">전체 (비로그인 포함)</option>
        </select>
        <button type="submit">필터</button>
      </form>

      {rows.length === 0 ? (
        <div className="empty">결과 없음</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>시각</th>
              <th>유저</th>
              <th>UID</th>
              <th>이메일</th>
              <th>경로</th>
              <th>IP</th>
              <th>국가</th>
              <th>referer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const u = r.userId ? userMap.get(r.userId) : undefined;
              return (
                <tr key={r.id}>
                  <td className="mono muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
                  <td>{u?.name ?? <span className="muted">익명</span>}</td>
                  <td className="mono" style={{ fontSize: 10, color: '#64748B', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.userId ?? ''}>
                    {r.userId ? r.userId.slice(0, 12) : '-'}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>{u?.email ?? '-'}</td>
                  <td className="mono">{r.path}</td>
                  <td className="mono">{r.ip ?? '-'}</td>
                  <td className="mono">{r.country ?? '-'}</td>
                  <td className="mono muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.referer ?? ''}>
                    {r.referer ?? '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Pager base="/logs" uid={uid} only={onlyLoggedIn ? 'auth' : 'all'} page={page} totalPages={totalPages} />
    </>
  );
}

function Pager({ base, uid, only, page, totalPages }: { base: string; uid: string; only: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const mk = (p: number) => {
    const q = new URLSearchParams();
    if (uid) q.set('uid', uid);
    if (only) q.set('only', only);
    q.set('page', String(p));
    return `${base}?${q.toString()}`;
  };
  return (
    <div className="pager">
      {page > 1 ? <Link href={mk(page - 1)}>← 이전</Link> : <span className="disabled">← 이전</span>}
      <span className="disabled">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={mk(page + 1)}>다음 →</Link> : <span className="disabled">다음 →</span>}
    </div>
  );
}
