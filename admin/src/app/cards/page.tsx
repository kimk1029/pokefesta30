import { type CSSProperties } from 'react';
import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { fmtDate, parseIntParam } from '@/lib/format';
import { CatalogReparseButton } from '@/components/CatalogReparseButton';
import { CARD_GAME_LABEL, type CardGame } from '../../../../shared/cardStatics';
import { getCardPack } from '../../../../shared/data/cardPacks';

/** 세트코드(예: "SV8A")를 박스 한글명으로. CARD_PACKS 에 없으면 null. */
function setCodeToKo(setCode: string | null | undefined): string | null {
  if (!setCode) return null;
  return getCardPack(setCode)?.name ?? getCardPack(setCode.toLowerCase())?.name ?? null;
}

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;
const GAMES: CardGame[] = ['pokemon', 'onepiece', 'yugioh', 'other'];

interface SearchParams {
  q?: string;
  page?: string;
  kind?: string;
  game?: string;
  /** 정확 일치 세트코드 필터 — 세트코드 클릭 시. */
  set?: string;
  /** 'set' 이면 세트코드별로 모아서(정렬+그룹 헤더) 표시. */
  group?: string;
}

// 코드/식별자 컬럼은 줄바꿈 금지(좁아도 한 줄 유지).
const NOWRAP: CSSProperties = { whiteSpace: 'nowrap' };

interface LatestSnap {
  apparelId: number;
  minPrice: number;
  priceSingle: number;
  pricePsa10: number;
  fetchedAt: Date;
}

const GAME_TAG_STYLE: Record<string, { background: string; color: string }> = {
  pokemon: { background: '#FEF9C3', color: '#854D0E' },
  onepiece: { background: '#FEE2E2', color: '#B91C1C' },
  yugioh: { background: '#EDE9FE', color: '#6D28D9' },
  other: { background: '#F1F5F9', color: '#64748B' },
};

/** '' (미분류) 는 'other' 와 함께 묶어서 필터/표시. */
function gameWhere(game: string): Prisma.SnkrdunkCardWhereInput | null {
  if (!GAMES.includes(game as CardGame)) return null;
  if (game === 'other') return { game: { in: ['other', ''] } };
  return { game };
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q ?? '').trim();
  const kind = searchParams.kind === 'single' || searchParams.kind === 'box' ? searchParams.kind : '';
  const game = GAMES.includes((searchParams.game ?? '') as CardGame) ? (searchParams.game as CardGame) : '';
  const set = (searchParams.set ?? '').trim();
  const groupBySet = searchParams.group === 'set';
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
  if (set) filters.push({ setCode: set });
  const gw = game ? gameWhere(game) : null;
  if (gw) filters.push(gw);
  const where: Prisma.SnkrdunkCardWhereInput = filters.length ? { AND: filters } : {};

  // 세트코드별 보기: 세트코드→카드번호 순으로 정렬해 같은 세트가 인접하게.
  const orderBy: Prisma.SnkrdunkCardOrderByWithRelationInput[] = groupBySet
    ? [{ setCode: 'asc' }, { cardNumber: 'asc' }, { apparelId: 'asc' }]
    : [{ firstSeenAt: 'desc' }];

  const [cards, total, totalAll, gameCounts, missingCount] = await Promise.all([
    prisma.snkrdunkCard.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
    }),
    prisma.snkrdunkCard.count({ where }),
    prisma.snkrdunkCard.count(),
    prisma.snkrdunkCard.groupBy({ by: ['game'], _count: { _all: true } }),
    prisma.snkrdunkCard.count({ where: { OR: [{ setCode: null }, { cardNumber: null }] } }),
  ]);

  const countByGame = new Map<string, number>();
  for (const g of gameCounts) {
    const key = g.game === '' ? 'other' : g.game;
    countByGame.set(key, (countByGame.get(key) ?? 0) + g._count._all);
  }

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
  const qs = (over: { kind?: string; game?: string; set?: string; group?: string }) => {
    const k = over.kind ?? kind;
    const g = over.game ?? game;
    const s = over.set ?? set;
    const gr = over.group ?? (groupBySet ? 'set' : '');
    const parts = [
      q ? `q=${encodeURIComponent(q)}` : '',
      k ? `kind=${k}` : '',
      g ? `game=${g}` : '',
      s ? `set=${encodeURIComponent(s)}` : '',
      gr ? `group=${gr}` : '',
    ].filter(Boolean);
    return parts.length ? `?${parts.join('&')}` : '';
  };

  // 테이블 헤더 — 일반/아코디언 양쪽에서 재사용.
  const head = (
    <thead>
      <tr>
        <th>이미지</th>
        <th style={NOWRAP}>ID</th>
        <th style={NOWRAP}>게임</th>
        <th>카드명</th>
        <th style={NOWRAP}>세트코드</th>
        <th style={NOWRAP}>카드번호</th>
        <th style={NOWRAP}>레어도</th>
        <th style={NOWRAP}>분류</th>
        <th style={NOWRAP}>품번</th>
        <th style={{ textAlign: 'right', ...NOWRAP }}>최신가 PSA10 / 싱글 (JPY)</th>
        <th style={NOWRAP}>수집일</th>
      </tr>
    </thead>
  );

  // 카드 한 행 → <tr>. (일반 테이블 / 세트코드 아코디언에서 공통 사용)
  const rowFor = (c: (typeof cards)[number]) => {
    const snap = snapMap.get(c.apparelId);
    const gKey = c.game === '' ? 'other' : c.game;
    const gStyle = GAME_TAG_STYLE[gKey] ?? GAME_TAG_STYLE.other;
    const setKo = setCodeToKo(c.setCode);
    return (
      <tr key={c.apparelId}>
        <td>
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.imageUrl}
              alt={c.koName || c.localizedName || c.name || ''}
              style={{ width: 34, height: 46, objectFit: 'contain', display: 'block' }}
              loading="lazy"
            />
          ) : (
            <span className="muted">-</span>
          )}
        </td>
        <td className="mono" style={NOWRAP}>
          <a href={`https://snkrdunk.com/apparels/${c.apparelId}`} target="_blank" rel="noreferrer">
            {c.apparelId}
          </a>
        </td>
        <td style={NOWRAP}>
          <span className="tag" style={gStyle}>
            {CARD_GAME_LABEL[gKey as CardGame] ?? '기타'}
          </span>
        </td>
        <td>
          {c.koName || c.localizedName || c.name || <span className="muted">-</span>}
          {c.koName && (c.localizedName || c.name) && (
            <div className="muted">{c.localizedName || c.name}</div>
          )}
        </td>
        <td style={NOWRAP}>
          {c.setCode ? (
            <>
              {/* 세트코드 클릭 → 해당 세트만 모아보기. 아래에 박스 한글명. */}
              <Link className="mono" href={`/cards${qs({ set: c.setCode })}`}>{c.setCode}</Link>
              {setKo && <div className="muted">{setKo}</div>}
            </>
          ) : (
            <span className="tag tag-report">미파싱</span>
          )}
        </td>
        <td className="mono" style={NOWRAP}>
          {c.cardNumber || <span className="tag tag-report">미파싱</span>}
        </td>
        <td style={NOWRAP}>{c.rarity ? <span className="tag tag-general">{c.rarity}</span> : <span className="muted">-</span>}</td>
        <td style={NOWRAP}>
          <span className={`tag ${c.itemKind === 'box' ? 'tag-open' : ''}`}>{c.itemKind}</span>
        </td>
        <td className="mono" style={NOWRAP}>{c.productNumber || <span className="muted">-</span>}</td>
        <td className="mono" style={{ textAlign: 'right', ...NOWRAP }}>
          {snap ? (
            <>
              <div>PSA10 {snap.pricePsa10 > 0 ? `¥${snap.pricePsa10.toLocaleString()}` : '—'}</div>
              <div>
                싱글{' '}
                {snap.priceSingle > 0
                  ? `¥${snap.priceSingle.toLocaleString()}`
                  : snap.minPrice > 0
                    ? `¥${snap.minPrice.toLocaleString()}~`
                    : '—'}
              </div>
              <div className="muted">{fmtDate(snap.fetchedAt)}</div>
            </>
          ) : (
            <span className="muted">-</span>
          )}
        </td>
        <td className="muted" style={NOWRAP}>{fmtDate(c.firstSeenAt)}</td>
      </tr>
    );
  };

  // 세트코드별 보기: 인접한 같은 setCode 행을 그룹으로 묶음(orderBy 가 setCode 순이라 연속).
  const groups: { setCode: string; rows: typeof cards }[] = [];
  if (groupBySet) {
    for (const c of cards) {
      const sc = c.setCode ?? '';
      const last = groups[groups.length - 1];
      if (last && last.setCode === sc) last.rows.push(c);
      else groups.push({ setCode: sc, rows: [c] });
    }
  }

  return (
    <>
      <h1 className="admin-h1">카드 카탈로그</h1>
      <p className="admin-sub">
        스니덩 조회 시 자동 적재된 카드 DB · 총 {totalAll.toLocaleString()}건
        {' '}({GAMES.map((g) => `${CARD_GAME_LABEL[g]} ${(countByGame.get(g) ?? 0).toLocaleString()}`).join(' / ')})
        · 코드/번호 미파싱 {missingCount.toLocaleString()}건
        · 검색결과 {total.toLocaleString()}건 · {page} / {totalPages} 페이지
      </p>

      <form className="search" method="get">
        {kind && <input type="hidden" name="kind" value={kind} />}
        {game && <input type="hidden" name="game" value={game} />}
        {set && <input type="hidden" name="set" value={set} />}
        {groupBySet && <input type="hidden" name="group" value="set" />}
        <input name="q" placeholder="카드명 / 세트코드 / 카드번호 / 품번 / apparelId 로 검색" defaultValue={q} />
        <button type="submit">검색</button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[{ g: '', label: '전체' }, ...GAMES.map((g) => ({ g, label: CARD_GAME_LABEL[g] }))].map((t) => (
            <Link
              key={t.g || 'all'}
              href={`/cards${qs({ game: t.g })}`}
              className="btn"
              style={t.g === game ? { background: '#3B82F6', color: '#fff', borderColor: '#3B82F6' } : undefined}
            >
              {t.label}
            </Link>
          ))}
          <span style={{ width: 10 }} />
          {[
            { k: '', label: '싱글+박스' },
            { k: 'single', label: '싱글' },
            { k: 'box', label: '박스' },
          ].map((t) => (
            <Link
              key={t.k || 'allkind'}
              href={`/cards${qs({ kind: t.k })}`}
              className="btn"
              style={t.k === kind ? { background: '#0F766E', color: '#fff', borderColor: '#0F766E' } : undefined}
            >
              {t.label}
            </Link>
          ))}
          <span style={{ width: 10 }} />
          {/* 세트코드별 모아보기 토글 */}
          <Link
            href={`/cards${qs({ group: groupBySet ? '' : 'set' })}`}
            className="btn"
            style={groupBySet ? { background: '#7C3AED', color: '#fff', borderColor: '#7C3AED' } : undefined}
          >
            세트코드별
          </Link>
          {/* 활성 세트코드 필터 칩 (해제 가능) */}
          {set && (
            <Link
              href={`/cards${qs({ set: '' })}`}
              className="btn"
              style={{ background: '#1D4ED8', color: '#fff', borderColor: '#1D4ED8', ...NOWRAP }}
            >
              세트 {set} ✕
            </Link>
          )}
        </div>
        <CatalogReparseButton />
      </div>

      {cards.length === 0 ? (
        <div className="empty">저장된 카드가 없습니다.</div>
      ) : groupBySet ? (
        // 세트코드별 아코디언 — 박스별로 묶어 접었다 펼 수 있게.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.map((g) => {
            const ko = setCodeToKo(g.setCode);
            const label = g.setCode
              ? ko
                ? `${ko} (${g.setCode})`
                : g.setCode
              : '세트코드 미파싱';
            return (
              <details key={g.setCode || '_none'} open>
                <summary
                  style={{
                    cursor: 'pointer',
                    padding: '9px 12px',
                    background: '#EEF2FF',
                    fontWeight: 700,
                    color: '#3730A3',
                    borderRadius: 6,
                    ...NOWRAP,
                  }}
                >
                  📦 {label} · {g.rows.length}건
                </summary>
                <table className="tbl" style={{ marginTop: 6 }}>
                  {head}
                  <tbody>{g.rows.map(rowFor)}</tbody>
                </table>
              </details>
            );
          })}
        </div>
      ) : (
        <table className="tbl">
          {head}
          <tbody>{cards.map(rowFor)}</tbody>
        </table>
      )}

      <Pager q={q} kind={kind} game={game} set={set} group={groupBySet ? 'set' : ''} page={page} totalPages={totalPages} />
    </>
  );
}

function Pager({ q, kind, game, set, group, page, totalPages }: { q: string; kind: string; game: string; set: string; group: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const extra = [
    q ? `&q=${encodeURIComponent(q)}` : '',
    kind ? `&kind=${kind}` : '',
    game ? `&game=${game}` : '',
    set ? `&set=${encodeURIComponent(set)}` : '',
    group ? `&group=${group}` : '',
  ].join('');
  return (
    <div className="pager">
      {page > 1 ? <Link href={`/cards?page=${page - 1}${extra}`}>← 이전</Link> : <span className="disabled">← 이전</span>}
      <span className="disabled">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={`/cards?page=${page + 1}${extra}`}>다음 →</Link> : <span className="disabled">다음 →</span>}
    </div>
  );
}
