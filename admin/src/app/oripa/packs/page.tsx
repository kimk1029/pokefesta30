import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/format';
import { ensureSeeded, type PackPrize } from '@/lib/oripaPacks';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await ensureSeeded();
  const packs = await prisma.oripaPack.findMany({ orderBy: { price: 'asc' } });

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h1 className="admin-h1" style={{ margin: 0 }}>오리파 팩 관리</h1>
        <Link href="/oripa/packs/new" className="btn" style={{ background: '#3B82F6', color: '#fff', borderColor: '#3B82F6' }}>
          + 신규 오리파
        </Link>
      </div>
      <p className="admin-sub">박스별 가격 · 상품 풀 · 활성 여부 관리</p>

      {packs.length === 0 ? (
        <div className="empty">팩이 없습니다.</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 60 }}></th>
              <th>ID</th>
              <th>티어</th>
              <th>이름</th>
              <th>설명</th>
              <th style={{ textAlign: 'right' }}>가격(P)</th>
              <th style={{ textAlign: 'right' }}>상품 수</th>
              <th>활성</th>
              <th>수정</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {packs.map((p) => {
              const prizes = Array.isArray(p.prizes) ? (p.prizes as unknown as PackPrize[]) : [];
              return (
                <tr key={p.id}>
                  <td style={{ fontSize: 24 }}>{p.emoji}</td>
                  <td className="mono">{p.id}</td>
                  <td><span className="tag">{p.tier}</span></td>
                  <td>{p.name}</td>
                  <td className="muted" style={{ maxWidth: 260 }}>{p.desc}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{p.price.toLocaleString()}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{prizes.length}</td>
                  <td>
                    {p.active ? (
                      <span className="tag tag-done">활성</span>
                    ) : (
                      <span className="tag">비활성</span>
                    )}
                  </td>
                  <td className="mono muted">{fmtDate(p.updatedAt)}</td>
                  <td>
                    <Link href={`/oripa/packs/${p.id}`} className="btn">편집</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
