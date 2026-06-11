import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

interface SearchParams {
  q?: string;
  page?: string;
  kind?: string;
}

interface LatestSnap {
  apparelId: number;
  minPrice: number;
  priceSingle: number;
  pricePsa10: number;
  fetchedAt: Date;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q ?? '').trim();
  const kind = searchParams.kind === 'single' || searchParams.kind === 'box' ? searchParams.kind : '';
  const page = parseIntParam(searchParams.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const filters: Prisma.SnkrdunkCardWhereInput[] = [];
  if (q) {
    const or: Prisma.SnkrdunkCardWhereInput[] = [
      { name: { contains: q, mode: 'insensitive' } },
      { localizedName: { contains: q, mode: 'insensitive' } },
      { koName: { contains: q, mode: 'insensitive' } },
      { setCode: { contains: q, mode: 'insensitive' } },
      { cardNumber: { contains: q } },
      { productNumber: { contains: q, mode: 'insensitive' } },
      { packCode: { contains: q, mode: 'insensitive' } },
    ];
    if (/^\d+$/.test(q)) or.push({ apparelId: Number(q) });
    filters.push({ OR: or });
  }
  if (kind) filters.push({ itemKind: kind });
  const where: Prisma.SnkrdunkCardWhereInput = filters.length ? { AND: filters } : {};

  const [cards, total, totalAll, totalSingle, totalBox] = await Promise.all([
    prisma.snkrdunkCard.findMany({
      where,
      orderBy: { firstSeenAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.snkrdunkCard.count({ where }),
    prisma.snkrdunkCard.count(),
    prisma.snkrdunkCard.count({ where: { itemKind: 'single' } }),
    prisma.snkrdunkCard.count({ where: { itemKind: 'box' } }),
  ]);

  // 화면에 보이는 카드들의 최신 시세 스냅샷만 조회
  const snapMap = new Map<number, LatestSnap>();
  if (cards.length) {
    const ids = cards.map((c) => c.apparelId);
    const snaps = await prisma.$queryRaw<LatestSnap[]>`
      SELECT DISTINCT ON ("apparelId")
        "apparelId", "minPrice", "priceSingle", "pricePsa10", "fetchedAt"
      FROM "snkrdunk_price_snapshots"
      WHERE "apparelId" IN (${Prisma.join(ids)})
      ORDER BY "apparelId", "fetchedAt" DESC
    `;
    for (const s of snaps) snapMap.set(s.apparelId, s);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (k: string) =>
    [q ? `q=${encodeURIComponent(q)}` : '', k ? `kind=${k}` : ''].filter(Boolean).join('&');

  return (
    <>
      <h1 className="admin-h1">카드 카탈로그</h1>
      <p className="admin-sub">
        스니덩 조회 시 자동 적재된 카드 DB · 총 {totalAll.toLocaleString()}건
        (싱글 {totalSingle.toLocaleString()} / 박스 {totalBox.toLocaleString()})
        · 검색결과 {total.toLocaleString()}건 · {page} / {totalPages} 페이지
      </p>

      <form className="search" method="get">
        {kind && <input type="hidden" name="kind" value={kind} />}
        <input name="q" placeholder="카드명 / 세트코드 / 카드번호 / 품번 / apparelId 로 검색" defaultValue={q} />
        <button type="submit">검색</button>
      </form>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { k: '', label: '전체' },
          { k: 'single', label: '싱글' },
          { k: 'box', label: '박스' },
        ].map((t) => (
          <Link
            key={t.k}
            href={`/cards${qs(t.k) ? `?${qs(t.k)}` : ''}`}
            className="btn"
            style={t.k === kind ? { background: '#3B82F6', color: '#fff', borderColor: '#3B82F6' } : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="empty">저장된 카드가 없습니다.</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>이미지</th>
              <th>ID</th>
              <th>카드명</th>
              <th>세트 / 번호</th>
              <th>레어도</th>
              <th>분류</th>
              <th>품번</th>
              <th>박스</th>
              <th style={{ textAlign: 'right' }}>최신가 (JPY)</th>
              <th>수집일</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => {
              const snap = snapMap.get(c.apparelId);
              const price = snap ? snap.priceSingle || snap.minPrice : 0;
              return (
                <tr key={c.apparelId}>
                  <td>
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt=""
                        style={{ width: 34, height: 46, objectFit: 'contain', display: 'block' }}
                        loading="lazy"
                      />
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td className="mono">
                    <a href={`https://snkrdunk.com/apparels/${c.apparelId}`} target="_blank" rel="noreferrer">
                      {c.apparelId}
                    </a>
                  </td>
                  <td>
                    {c.koName || c.localizedName || c.name || <span className="muted">-</span>}
                    {c.koName && (c.localizedName || c.name) && (
                      <div className="muted">{c.localizedName || c.name}</div>
                    )}
                  </td>
                  <td className="mono">
                    {c.setCode || c.cardNumber ? `${c.setCode ?? '?'} ${c.cardNumber ?? ''}`.trim() : <span className="muted">-</span>}
                  </td>
                  <td>{c.rarity ? <span className="tag tag-general">{c.rarity}</span> : <span className="muted">-</span>}</td>
                  <td>
                    <span className={`tag ${c.itemKind === 'box' ? 'tag-open' : ''}`}>{c.itemKind}</span>
                  </td>
                  <td className="mono">{c.productNumber || <span className="muted">-</span>}</td>
                  <td className="mono">{c.packCode || <span className="muted">-</span>}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {price > 0 ? (
                      <>
                        ¥{price.toLocaleString()}
                        <div className="muted">{fmtDate(snap!.fetchedAt)}</div>
                      </>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td className="muted">{fmtDate(c.firstSeenAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Pager q={q} kind={kind} page={page} totalPages={totalPages} />
    </>
  );
}

function Pager({ q, kind, page, totalPages }: { q: string; kind: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const extra = [q ? `&q=${encodeURIComponent(q)}` : '', kind ? `&kind=${kind}` : ''].join('');
  return (
    <div className="pager">
      {page > 1 ? <Link href={`/cards?page=${page - 1}${extra}`}>← 이전</Link> : <span className="disabled">← 이전</span>}
      <span className="disabled">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={`/cards?page=${page + 1}${extra}`}>다음 →</Link> : <span className="disabled">다음 →</span>}
    </div>
  );
}
