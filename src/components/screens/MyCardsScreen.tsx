'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { findCardEntry, type CardCatalogEntry } from '@/lib/cardsCatalog';
import type { MyCardWithPrice } from '@/lib/queries';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';

type ViewMode = 'grid' | 'list' | 'binder' | 'album';
type SortBy = 'name' | 'price' | 'grade' | 'recent';
type RarFilter = 'all' | 'C' | 'A' | 'B' | 'S';

interface Props {
  cards: MyCardWithPrice[];
}

interface DisplayCard {
  src: MyCardWithPrice;
  catalog?: CardCatalogEntry;
  /** 표시 이름 우선순위: nickname > catalog.name > OCR 식별자. */
  name: string;
  /** UI 분류용 — 카탈로그 게임 (현재 카탈로그는 모두 포켓몬). */
  game: string;
  /** 카탈로그 grade 가 우선 (S/A/B/C). 없으면 'C'. */
  rar: 'S' | 'A' | 'B' | 'C';
  /** 모의 그레이딩 라벨에서 PSA 숫자 추출. */
  gradeNum: number | null;
  price: number;
}

const GAME_COLORS: Record<string, string> = {
  포켓몬: '#E63946',
  유희왕: '#7C3AED',
  원피스: '#F97316',
  MTG: '#22C55E',
  스포츠: '#3A5BD9',
  기타: '#94A3B8',
};

export function MyCardsScreen({ cards: initial }: Props) {
  const [cards, setCards] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [game, setGame] = useState('전체');
  const [rar, setRar] = useState<RarFilter>('all');
  const [sort, setSort] = useState<SortBy>('recent');
  const router = useRouter();

  const display: DisplayCard[] = useMemo(
    () =>
      cards.map((c) => {
        const catalog = c.cardId ? findCardEntry(c.cardId) : undefined;
        return {
          src: c,
          catalog,
          name:
            c.nickname ||
            catalog?.name ||
            (c.ocrSetCode || c.ocrCardNumber
              ? `${c.ocrSetCode ?? '?'} ${c.ocrCardNumber ?? ''}`.trim()
              : '미식별 카드'),
          game: catalog ? '포켓몬' : '기타',
          rar: (catalog?.grade as 'S' | 'A' | 'B' | 'C' | undefined) ?? 'C',
          gradeNum: parsePsa(c.gradeEstimate),
          price: c.latestPrice,
        };
      }),
    [cards],
  );

  const games = useMemo(() => {
    const set = new Set<string>();
    for (const d of display) set.add(d.game);
    return ['전체', ...Array.from(set)];
  }, [display]);

  const filtered = useMemo(() => {
    let out = display.filter(
      (c) =>
        (game === '전체' || c.game === game) &&
        (rar === 'all' || c.rar === rar) &&
        (search === '' ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.game.toLowerCase().includes(search.toLowerCase())),
    );
    if (sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'price') out = [...out].sort((a, b) => b.price - a.price);
    if (sort === 'grade') out = [...out].sort((a, b) => (b.gradeNum ?? 0) - (a.gradeNum ?? 0));
    // recent: createdAt desc — 이미 서버에서 desc 정렬돼 들어옴
    return out;
  }, [display, game, rar, search, sort]);

  const totalVal = filtered.reduce((s, c) => s + c.price, 0);
  const gradedN = filtered.filter((c) => c.gradeNum !== null).length;
  const memoN = filtered.filter((c) => Boolean(c.src.memo)).length;

  const onDelete = (id: number) => {
    if (pending) return;
    if (!confirm('이 카드를 삭제할까요?')) return;
    setErr(null);
    startTransition(async () => {
      try {
        const r = await fetch(`/api/me/cards/${id}`, { method: 'DELETE' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setCards((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : '삭제 실패');
      }
    });
  };

  return (
    <>
      <StatusBar />
      <AppBar
        title="내 컬렉션"
        showBack
        backHref="/"
        right={
          <Link href="/cards/add" className="appbar-right" aria-label="카드 추가">
            ＋
          </Link>
        }
      />
      <div style={{ height: 12 }} />

      {/* Summary strip */}
      <div className="cv-strip">
        <div className="cv-strip-cell cv-strip-a">총 {filtered.length}장</div>
        <div className="cv-strip-cell cv-strip-b">${fmtUsd(totalVal)}</div>
        <div className="cv-strip-cell cv-strip-c">그레이딩 {gradedN}</div>
      </div>
      <div className="cv-archive-line">
        📚 아카이브 · 메모 {memoN}건 · 미식별 {filtered.filter((c) => !c.catalog).length}장
      </div>

      {/* Search */}
      <div className="cv-search">
        <span style={{ fontSize: 14 }}>🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="카드명, 게임 검색..."
        />
      </div>

      {/* Game filter */}
      <div className="cv-chip-row">
        {games.map((g) => (
          <button
            key={g}
            className={`cv-chip${game === g ? ' on' : ''}`}
            onClick={() => setGame(g)}
            type="button"
          >
            {g === '전체' ? 'ALL' : g}
          </button>
        ))}
      </div>

      {/* Rarity filter */}
      <div className="cv-chip-row">
        {(['all', 'S', 'A', 'B', 'C'] as RarFilter[]).map((r) => (
          <button
            key={r}
            className={`cv-chip${rar === r ? ' on' : ''}`}
            onClick={() => setRar(r)}
            type="button"
          >
            {r === 'all' ? 'ALL' : r}
          </button>
        ))}
      </div>

      {/* Toolbar — sort + view */}
      <div className="cv-toolbar">
        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
          {(
            [
              ['recent', '최근'],
              ['name', '이름'],
              ['price', '가격'],
              ['grade', '등급'],
            ] as Array<[SortBy, string]>
          ).map(([k, lb]) => (
            <button
              key={k}
              type="button"
              className={`cv-sort-btn${sort === k ? ' on' : ''}`}
              onClick={() => setSort(k)}
            >
              {lb}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {(
            [
              ['grid', '⊞'],
              ['list', '☰'],
              ['binder', '📒'],
              ['album', '🎞'],
            ] as Array<[ViewMode, string]>
          ).map(([v, icon]) => (
            <button
              key={v}
              type="button"
              className={`cv-view-btn${view === v ? ' on' : ''}`}
              onClick={() => setView(v)}
              aria-label={v}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div style={{ padding: '8px 12px', fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--red)', textAlign: 'center' }}>
          ⚠ {err}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="cv-empty">
          저장된 카드가 없어요
          <br />
          <Link href="/cards/add" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
            ＋ 카드 추가하기
          </Link>
        </div>
      ) : view === 'grid' ? (
        <GridView cards={filtered} onDelete={onDelete} />
      ) : view === 'list' ? (
        <ListView cards={filtered} onDelete={onDelete} />
      ) : view === 'binder' ? (
        <BinderView cards={filtered} />
      ) : (
        <AlbumView cards={filtered} />
      )}

      <div className="bggap" />
    </>
  );
}

/* ---------------- views ---------------- */

function GridView({ cards, onDelete }: { cards: DisplayCard[]; onDelete: (id: number) => void }) {
  return (
    <div className="cv-coll-grid">
      {cards.map((c) => (
        <div key={c.src.id} className="cv-coll-item">
          <Link href={detailHref(c)} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <CardImg card={c} h={110} />
            {c.src.memo && <div className="cv-coll-noteflag" title={c.src.memo}>📝</div>}
          </Link>
          <div className="cv-coll-info">
            <div className="cv-coll-name" title={c.name}>
              {c.name}
            </div>
            <div className="cv-coll-date">{fmtDate(c.src.createdAt)}</div>
            <div className="cv-coll-meta">
              <span className={`cv-rar cv-rar-${c.rar}`}>{c.rar}</span>
              {c.gradeNum !== null && <GradeBadge g={c.gradeNum} />}
            </div>
            {c.price > 0 && <div className="cv-price">${fmtUsd(c.price)}</div>}
            <button
              type="button"
              onClick={() => onDelete(c.src.id)}
              style={{
                marginTop: 6,
                width: '100%',
                padding: 4,
                background: 'transparent',
                fontFamily: 'var(--f1)',
                fontSize: 7,
                color: 'var(--ink3)',
                letterSpacing: 0.3,
                border: '1px solid var(--pap3)',
                cursor: 'pointer',
              }}
            >
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ cards, onDelete }: { cards: DisplayCard[]; onDelete: (id: number) => void }) {
  return (
    <div className="cv-sect">
      {cards.map((c) => (
        <div key={c.src.id} className="cv-list-card">
          <Link href={detailHref(c)} style={{ display: 'block' }}>
            <div className="cv-list-thumb cv-card-img" style={{ background: gameBg(c.game) }}>
              <div className="cv-card-em" style={{ fontSize: 24 }}>
                {c.catalog?.emoji ?? '🃏'}
              </div>
            </div>
          </Link>
          <div className="cv-lc-body">
            <div className="cv-lc-title">{c.name}</div>
            <div className="cv-lc-sub">
              {c.src.gradeEstimate ?? '미그레이딩'}
              {c.src.ocrSetCode ? ` · ${c.src.ocrSetCode}` : ''}
              {c.src.ocrCardNumber ? ` ${c.src.ocrCardNumber}` : ''}
              {' · '}
              <span style={{ color: 'var(--ink3)' }}>아카이빙 {fmtDate(c.src.createdAt)}</span>
            </div>
            <div className="cv-lc-row">
              <span className={`cv-rar cv-rar-${c.rar}`}>{c.rar}</span>
              <span className="cv-tag cv-tag-game" style={{ background: gameAccent(c.game), color: '#fff' }}>
                {c.game}
              </span>
              {c.gradeNum !== null && <span className="cv-tag cv-tag-graded">PSA {c.gradeNum}</span>}
            </div>
            {c.src.memo && (
              <div className="cv-lc-memo">
                📝 {c.src.memo}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              {c.price > 0 ? (
                <span style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--grn-dk)', letterSpacing: 0.3 }}>
                  ${fmtUsd(c.price)}
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)' }}>시세 없음</span>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <Link
                  href={`/write/trade?userCardId=${c.src.id}`}
                  style={{
                    padding: '4px 7px',
                    background: 'var(--ink)',
                    color: 'var(--gold)',
                    fontFamily: 'var(--f1)',
                    fontSize: 7,
                    letterSpacing: 0.3,
                    textDecoration: 'none',
                  }}
                >
                  거래
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(c.src.id)}
                  style={{
                    padding: '4px 7px',
                    background: 'var(--white)',
                    color: 'var(--red)',
                    fontFamily: 'var(--f1)',
                    fontSize: 7,
                    letterSpacing: 0.3,
                    border: '2px solid var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BinderView({ cards }: { cards: DisplayCard[] }) {
  return (
    <div className="cv-binder">
      <div className="cv-binder-hd">📒 바인더 · {cards.length}장</div>
      <div className="cv-binder-grid">
        {cards.map((c) => (
          <Link
            key={c.src.id}
            href={detailHref(c)}
            className="cv-binder-item"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div className="cv-binder-img" style={{ background: gameBg(c.game) }}>
              {c.catalog?.emoji ?? '🃏'}
            </div>
            <div className="cv-binder-info">
              <div className="cv-binder-name" title={c.name}>
                {c.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`cv-rar cv-rar-${c.rar}`} style={{ fontSize: 6, padding: '1px 4px' }}>
                  {c.rar}
                </span>
                {c.gradeNum !== null && (
                  <span style={{ fontFamily: 'var(--f1)', fontSize: 6, color: 'var(--gold-dk)' }}>P{c.gradeNum}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AlbumView({ cards }: { cards: DisplayCard[] }) {
  const byGame = new Map<string, DisplayCard[]>();
  for (const c of cards) {
    const arr = byGame.get(c.game) ?? [];
    arr.push(c);
    byGame.set(c.game, arr);
  }
  return (
    <>
      {Array.from(byGame.entries()).map(([g, list]) => (
        <div key={g} className="cv-album-sect">
          <div className="cv-album-hd" style={{ background: gameAccent(g) }}>
            <div className="cv-album-name">{g}</div>
            <div className="cv-album-cnt">{list.length}장</div>
          </div>
          <div className="cv-album-row">
            {list.map((c) => (
              <Link
                key={c.src.id}
                href={detailHref(c)}
                className="cv-album-tile"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="cv-album-img" style={{ background: gameBg(g) }}>
                  {c.catalog?.emoji ?? '🃏'}
                </div>
                <div className="cv-album-meta">
                  <div className="cv-binder-name" title={c.name}>
                    {c.name}
                  </div>
                  {c.price > 0 && (
                    <div style={{ fontFamily: 'var(--f1)', fontSize: 7, color: 'var(--grn-dk)', letterSpacing: 0.2 }}>
                      ${fmtUsd(c.price)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------------- atoms ---------------- */

function CardImg({ card, h }: { card: DisplayCard; h: number }) {
  return (
    <div className="cv-card-img" style={{ height: h, background: gameBg(card.game) }}>
      {card.src.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.src.photoUrl}
          alt={card.name}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
      ) : (
        <div className="cv-card-em">{card.catalog?.emoji ?? '🃏'}</div>
      )}
    </div>
  );
}

function GradeBadge({ g }: { g: number }) {
  const cls = g >= 10 ? 'cv-g10' : g >= 9 ? 'cv-g9' : g >= 8 ? 'cv-g8' : 'cv-g7';
  return <span className={`cv-grade ${cls}`}>{g}</span>;
}

function gameBg(g: string): string {
  const c = GAME_COLORS[g] ?? '#1E293B';
  return `linear-gradient(160deg,${c}33,var(--ink2))`;
}
function gameAccent(g: string): string {
  return GAME_COLORS[g] ?? 'var(--ink)';
}

function fmtUsd(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '0';
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${mm}.${dd}`;
}

function parsePsa(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/PSA\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function detailHref(c: DisplayCard): string {
  return c.catalog ? `/cards/search?id=${encodeURIComponent(c.catalog.id)}` : '/my/cards';
}
