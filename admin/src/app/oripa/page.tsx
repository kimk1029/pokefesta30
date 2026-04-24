import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

interface SearchParams {
  packId?: string;
  drawn?: string;
  page?: string;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const packId = (searchParams.packId ?? '').trim();
  const drawn = searchParams.drawn;
  const page = parseIntParam(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(packId ? { packId } : {}),
    ...(drawn === 'yes' ? { drawn: true } : drawn === 'no' ? { drawn: false } : {}),
  };

  const [rows, total, packs] = await Promise.all([
    prisma.oripaTicket.findMany({
      where,
      orderBy: [{ packId: 'asc' }, { index: 'asc' }],
      skip,
      take: PAGE_SIZE,
      include: { drawnBy: { select: { id: true, name: true } } },
    }),
    prisma.oripaTicket.count({ where }),
    prisma.oripaTicket.groupBy({
      by: ['packId'],
      _count: { _all: true },
      where: { drawn: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <h1 className="admin-h1">오리파 관리</h1>
      <p className="admin-sub">
        전체 {total.toLocaleString()}칸 · {page} / {totalPages}
      </p>

      <div className="card" style={{ marginBottom: 14 }}>
        <h2>팩별 뽑힌 수</h2>
        {packs.length === 0 ? (
          <div className="muted">없음</div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {packs.map((p) => (
              <span key={p.packId} className="tag" style={{ fontSize: 12 }}>
                {p.packId}: {p._count._all}
              </span>
            ))}
          </div>
        )}
      </div>

      <form className="search" method="get">
        <input name="packId" placeholder="packId 필터 (예: default)" defaultValue={packId} />
        <select name="drawn" defaultValue={drawn ?? ''} style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 5 }}>
          <option value="">전체</option>
          <option value="yes">뽑힘</option>
          <option value="no">미오픈</option>
        </select>
        <button type="submit">필터</button>
      </form>

      {rows.length === 0 ? (
        <div className="empty">결과 없음</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>팩</th>
              <th>#</th>
              <th>상태</th>
              <th>등급</th>
              <th>경품</th>
              <th>뽑은이</th>
              <th>시각</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.packId}</td>
                <td className="mono">{t.index}</td>
                <td>
                  {t.drawn ? <span className="tag tag-done">drawn</span> : <span className="tag">open</span>}
                </td>
                <td className="mono">{t.grade ?? '-'}</td>
                <td>{t.prizeEmoji} {t.prizeName ?? ''}</td>
                <td>
                  {t.drawnBy?.name ? (
                    <span>{t.drawnBy.name}</span>
                  ) : t.drawnByName ? (
                    <span className="muted">{t.drawnByName} (mock)</span>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
                <td className="mono muted">{fmtDate(t.drawnAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager base="/oripa" packId={packId} drawn={drawn} page={page} totalPages={totalPages} />
    </>
  );
}

function Pager({
  base, packId, drawn, page, totalPages,
}: { base: string; packId: string; drawn: string | undefined; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const mk = (p: number) => {
    const q = new URLSearchParams();
    if (packId) q.set('packId', packId);
    if (drawn) q.set('drawn', drawn);
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
