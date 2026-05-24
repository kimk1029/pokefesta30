'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { findCardEntry, type CardCatalogEntry } from '@/lib/cardsCatalog';
import {
  detectRarity,
  RARITY_BG,
  RARITY_FG,
  RARITY_ORDER,
  type Rarity,
} from '@/lib/cardRarity';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import type { MyCardWithPrice } from '@/lib/queries';
import { useCurrency } from '@/components/CurrencyProvider';
import { usePriceMode } from '@/components/PriceModeProvider';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';

type ViewMode = 'grid' | 'list' | 'album' | 'film';
type SortBy = 'name' | 'price' | 'grade' | 'recent';
type RarFilter = 'all' | Rarity;

const VIEW_TABS: Array<[ViewMode, string]> = [
  ['grid', '바둑판'],
  ['list', '리스트'],
  ['album', '앨범'],
  ['film', '필름'],
];

interface Props {
  cards: MyCardWithPrice[];
}

interface DisplayCard {
  src: MyCardWithPrice;
  catalog?: CardCatalogEntry;
  /** 표시 이름 우선순위: nickname > snkrdunkName > catalog.name > OCR 식별자. */
  name: string;
  /** UI 분류용 — 카탈로그 게임. snkrdunk-added 카드는 '포켓몬' 으로 분류. */
  game: string;
  /** 카드명/별칭에서 추출한 TCG 등급 (C / U / R / RR / AR / SAR / SR / HR / UR / MA / MUR / CHR). */
  rar: Rarity;
  /** 모의 그레이딩 라벨에서 PSA 숫자 추출. */
  gradeNum: number | null;
  /** USD 가격 — 카드 카탈로그 스냅샷에서 옴. */
  price: number;
  /** JPY 가격 — snkrdunkApparelId 가 있는 경우. */
  priceJpy: number;
  /** photoUrl > snkrdunkImageUrl. */
  imageUrl: string | null;
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
  const { format } = useCurrency();
  const { mode: priceMode, setMode: setPriceMode } = usePriceMode();
  const [cards, setCards] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [game, setGame] = useState('전체');
  const [rar, setRar] = useState<RarFilter>('all');
  const [sort, setSort] = useState<SortBy>('recent');
  // 스니덩 카드(apparelId 有, 서버 trend 비어있음)는 sales-chart API로 추이를 받아 채움.
  const [snkrTrends, setSnkrTrends] = useState<Record<number, number[]>>({});
  const router = useRouter();

  useEffect(() => {
    const ids = Array.from(
      new Set(
        cards
          .filter((c) => c.snkrdunkApparelId != null && (!c.trend || c.trend.length < 2))
          .map((c) => c.snkrdunkApparelId as number),
      ),
    ).slice(0, 120);
    if (ids.length === 0) return;
    let alive = true;
    (async () => {
      const POOL = 6;
      for (let i = 0; i < ids.length && alive; i += POOL) {
        const batch = ids.slice(i, i + POOL);
        const results = await Promise.all(
          batch.map(async (id) => {
            try {
              const r = await fetch(`/api/snkrdunk/apparels/${id}/sales-chart`, { cache: 'no-store' });
              if (!r.ok) return [id, [] as number[]] as const;
              const j = (await r.json()) as { data?: { points?: Array<[number, number]> } };
              const pts = (j.data?.points ?? [])
                .map((p) => p[1])
                .filter((n) => typeof n === 'number' && n > 0);
              return [id, pts] as const;
            } catch {
              return [id, [] as number[]] as const;
            }
          }),
        );
        if (!alive) return;
        setSnkrTrends((prev) => {
          const next = { ...prev };
          for (const [id, pts] of results) next[id] = pts;
          return next;
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [cards]);

  const display: DisplayCard[] = useMemo(
    () =>
      cards.map((c) => {
        const catalog = c.cardId ? findCardEntry(c.cardId) : undefined;
        const fromSnk = c.snkrdunkApparelId != null;
        return {
          src: c,
          catalog,
          name: translateKnownCardNameToKo(
            c.nickname ||
              c.snkrdunkName ||
              catalog?.name ||
              (c.ocrSetCode || c.ocrCardNumber
                ? `${c.ocrSetCode ?? '?'} ${c.ocrCardNumber ?? ''}`.trim()
                : '미식별 카드'),
          ),
          game: catalog || fromSnk ? '포켓몬' : '기타',
          rar: detectRarity(c.nickname, c.snkrdunkName, catalog?.name),
          gradeNum: parsePsa(c.gradeEstimate),
          price: c.latestPrice,
          // priceMode 에 따라 single 또는 PSA10 가격 표시 (PSA10 데이터 없으면 single 폴백).
          priceJpy:
            priceMode === 'psa10' && c.pricePsa10Jpy > 0
              ? c.pricePsa10Jpy
              : c.priceSingleJpy ?? c.snkrdunkMinPriceJpy ?? 0,
          imageUrl: c.photoUrl || c.snkrdunkImageUrl || null,
        };
      }),
    [cards, priceMode],
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
    // 가격 정렬은 USD * 150 + JPY 로 거칠게 정규화 — 통화 혼합 컬렉션에서 큰 순서가 어긋나지 않게.
    if (sort === 'price')
      out = [...out].sort((a, b) => b.price * 150 + b.priceJpy - (a.price * 150 + a.priceJpy));
    if (sort === 'grade') out = [...out].sort((a, b) => (b.gradeNum ?? 0) - (a.gradeNum ?? 0));
    // recent: createdAt desc — 이미 서버에서 desc 정렬돼 들어옴
    return out;
  }, [display, game, rar, search, sort]);

  const totalVal = filtered.reduce((s, c) => s + c.price, 0);
  const totalJpy = filtered.reduce((s, c) => s + c.priceJpy, 0);
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

      {/* 좌우 오버플로 가드 — 내부 요소가 viewport 밖으로 새지 않도록. */}
      <div style={{ overflowX: 'hidden' }}>

      {/* Summary strip */}
      <div className="cv-strip">
        <div className="cv-strip-cell cv-strip-a">총 {filtered.length}장</div>
        <div className="cv-strip-cell cv-strip-b">
          {totalJpy > 0 ? format(totalJpy) : `$${fmtUsd(totalVal)}`}
        </div>
        <div className="cv-strip-cell cv-strip-c">그레이딩 {gradedN}</div>
      </div>
      <div className="cv-archive-line">
        📚 아카이브 · 메모 {memoN}건 · 미식별 {filtered.filter((c) => !c.catalog).length}장
      </div>

      {/* Search */}
      <div className="cv-search">
        <span style={{ fontSize: 15 }}>🔍</span>
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

      {/* Rarity filter — TCG 등급 (C/U/R/RR/AR/SAR/SR/HR/UR/MA/MUR/CHR).
          컬렉션에 존재하는 등급 + ALL 만 노출 (없는 등급은 chip 숨김). */}
      <div className="cv-chip-row">
        {(['all', ...RARITY_ORDER.filter((r) => display.some((c) => c.rar === r))] as RarFilter[]).map((r) => (
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

      {/* Sort + 싱글/PSA10 토글 (PSA10 시세 있는 카드가 하나라도 있을 때만) */}
      <div className="cv-toolbar">
        <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
        {cards.some((c) => (c.pricePsa10Jpy ?? 0) > 0) && (
          <div style={{ display: 'flex', boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)' }}>
            {(['single', 'psa10'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPriceMode(m)}
                style={{
                  padding: '6px 9px',
                  border: 0,
                  cursor: 'pointer',
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  letterSpacing: 0.3,
                  background: priceMode === m ? 'var(--gold)' : 'var(--white)',
                  color: priceMode === m ? 'var(--ink)' : 'var(--ink3)',
                }}
              >
                {m === 'single' ? '싱글' : 'PSA10'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View mode tabs (카드검색 결과 헤더 톤 — pixel-press subseg) */}
      <div className="cv-subseg">
        {VIEW_TABS.map(([k, lb]) => (
          <button
            key={k}
            type="button"
            className={view === k ? 'on' : ''}
            onClick={() => setView(k)}
          >
            {lb}
          </button>
        ))}
      </div>

      {err && (
        <div style={{ padding: '8px 12px', fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--red)', textAlign: 'center' }}>
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
        <ListView cards={filtered} onDelete={onDelete} snkrTrends={snkrTrends} />
      ) : view === 'album' ? (
        <AlbumView cards={filtered} />
      ) : (
        <FilmView cards={filtered} />
      )}

      </div>{/* /overflow guard */}

      <div className="bggap" />
    </>
  );
}

/* ---------------- views ---------------- */

function GridView({ cards, onDelete }: { cards: DisplayCard[]; onDelete: (id: number) => void }) {
  return (
    <div className="sect">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {cards.map((c) => (
          <GridItem key={c.src.id} c={c} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function GridItem({ c, onDelete }: { c: DisplayCard; onDelete: (id: number) => void }) {
  const { format } = useCurrency();
  const label = priceLabel(c, format);
  const hasPrice = label !== null;
  return (
    <div className="pack-grid-card" style={{ borderTop: `4px solid ${gameAccent(c.game)}`, minWidth: 0 }}>
      <Link
        href={detailHref(c)}
        style={{ display: 'block', textDecoration: 'none', color: 'inherit', position: 'relative' }}
      >
        <div style={{ aspectRatio: '63 / 88', background: 'var(--pap2)', overflow: 'hidden' }}>
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.imageUrl}
              alt={c.name}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
              <span style={{ fontSize: 37 }}>{c.catalog?.emoji ?? '🃏'}</span>
            </div>
          )}
          {c.src.memo && <div className="cv-coll-noteflag" title={c.src.memo}>📝</div>}
        </div>
        <div style={{ padding: '7px 8px 6px', borderTop: '3px solid var(--ink)' }}>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 10,
              letterSpacing: 0.2,
              marginBottom: 5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 30,
              lineHeight: 1.45,
              wordBreak: 'keep-all',
            }}
          >
            {c.name}
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '3px 6px',
              background: hasPrice ? 'var(--ink)' : 'var(--pap2)',
              color: hasPrice ? 'var(--gold)' : 'var(--ink3)',
              fontFamily: 'var(--f1)',
              fontSize: 11,
              letterSpacing: 0.3,
              boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
            }}
          >
            {hasPrice ? label : '시세 없음'}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onDelete(c.src.id)}
        style={{
          width: '100%',
          padding: '5px 0',
          background: 'var(--white)',
          color: 'var(--red)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          letterSpacing: 0.3,
          border: 0,
          borderTop: '3px solid var(--ink)',
          cursor: 'pointer',
        }}
      >
        ✕ 삭제
      </button>
    </div>
  );
}

function ListView({
  cards,
  onDelete,
  snkrTrends,
}: {
  cards: DisplayCard[];
  onDelete: (id: number) => void;
  snkrTrends: Record<number, number[]>;
}) {
  const { format } = useCurrency();
  // 서버 trend 가 있으면 그걸, 없으면(스니덩) sales-chart 로 받은 추이를 사용.
  const trendOf = (c: DisplayCard): number[] => {
    if (c.src.trend && c.src.trend.length >= 2) return c.src.trend;
    const id = c.src.snkrdunkApparelId;
    return id != null ? (snkrTrends[id] ?? []) : [];
  };
  return (
    <div style={{ margin: '0 var(--gap)' }}>
      {cards.map((c) => {
        const trend = trendOf(c);
        return (
        <div key={c.src.id} className="cv-list-card" style={{ minWidth: 0 }}>
          <Link href={detailHref(c)} style={{ display: 'block', flexShrink: 0 }}>
            <div
              className="cv-list-thumb"
              style={{
                background: gameBg(c.game),
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: '100%',
                    height: '100%',
                    fontSize: 25,
                  }}
                >
                  {c.catalog?.emoji ?? '🃏'}
                </div>
              )}
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
              <span
                className="cv-rar"
                style={{ background: RARITY_BG[c.rar], color: RARITY_FG[c.rar] }}
              >
                {c.rar}
              </span>
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
              {priceLabel(c, format) ? (
                <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--grn-dk)', letterSpacing: 0.3 }}>
                    {priceLabel(c, format)}
                  </span>
                  <ChangeBadge trend={trend} />
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)' }}>시세 없음</span>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <Link
                  href={`/write/trade?userCardId=${c.src.id}`}
                  style={{
                    padding: '4px 7px',
                    background: 'var(--ink)',
                    color: 'var(--gold)',
                    fontFamily: 'var(--f1)',
                    fontSize: 8,
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
                    fontSize: 8,
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
          {trend.length >= 2 && (
            <div
              style={{
                flexShrink: 0,
                alignSelf: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 3,
              }}
            >
              <MiniSparkline points={trend} />
              <span style={{ fontFamily: 'var(--f1)', fontSize: 7, color: 'var(--ink3)', letterSpacing: 0.2 }}>
                최근 추이
              </span>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

/** 앨범: 이미지만 — 텍스트 없이 3열 그리드. 카드 사진만 한눈에 보기. */
function AlbumView({ cards }: { cards: DisplayCard[] }) {
  return (
    <div className="sect">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 6,
        }}
      >
        {cards.map((c) => (
          <Link
            key={c.src.id}
            href={detailHref(c)}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              minWidth: 0,
              aspectRatio: '63 / 88',
              background: 'var(--pap2)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow:
                '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
            }}
          >
            {c.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.imageUrl}
                alt={c.name}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                <span style={{ fontSize: 33 }}>{c.catalog?.emoji ?? '🃏'}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** 필름: 가로 스크롤 한 줄. 컨테이너 안에서만 스크롤 — 페이지 자체는 안 넘어감. */
function FilmView({ cards }: { cards: DisplayCard[] }) {
  const { format } = useCurrency();
  return (
    <div className="sect" style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 6,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {cards.map((c) => (
          <Link
            key={c.src.id}
            href={detailHref(c)}
            style={{
              flexShrink: 0,
              width: 92,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                width: 92,
                aspectRatio: '63 / 88',
                background: 'var(--pap2)',
                overflow: 'hidden',
                position: 'relative',
                boxShadow:
                  '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
              }}
            >
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                  <span style={{ fontSize: 29 }}>{c.catalog?.emoji ?? '🃏'}</span>
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 9,
                letterSpacing: 0.2,
                marginTop: 6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.4,
              }}
              title={c.name}
            >
              {c.name}
            </div>
            {priceLabel(c, format) && (
              <div
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  color: 'var(--grn-dk)',
                  letterSpacing: 0.2,
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {priceLabel(c, format)}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---------------- atoms ---------------- */

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

/** USD > JPY 우선. 둘 다 없으면 null. JPY 는 currency 모드에 따라 ¥/₩ 자동 표시. */
function priceLabel(c: DisplayCard, format: (jpy: number) => string): string | null {
  if (c.price > 0) return `$${fmtUsd(c.price)}`;
  if (c.priceJpy > 0) return format(c.priceJpy);
  return null;
}

/** 어제(직전 스냅샷) 대비 등락율. trend 가 2개 미만이면 null. */
function changeFromTrend(trend: number[]): { pct: number; dir: 'up' | 'down' | 'flat' } | null {
  if (!Array.isArray(trend) || trend.length < 2) return null;
  const prev = trend[trend.length - 2];
  const last = trend[trend.length - 1];
  if (!(prev > 0)) return null;
  const pct = ((last - prev) / prev) * 100;
  const dir = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, dir };
}

/** 리스트 행 우측 미니 시세 차트. 색은 전체 추이(첫→끝) 기준. */
function MiniSparkline({ points }: { points: number[] }) {
  const w = 60;
  const h = 26;
  if (!Array.isArray(points) || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const yOf = (v: number) => h - ((v - min) / range) * (h - 4) - 2;
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${yOf(v).toFixed(1)}`)
    .join(' ');
  const up = points[points.length - 1] >= points[0];
  const color = up ? 'var(--red)' : 'var(--blu)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: 'block' }} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(points.length - 1) * stepX} cy={yOf(points[points.length - 1])} r="2" fill={color} />
    </svg>
  );
}

const CHANGE_COLOR: Record<'up' | 'down' | 'flat', string> = {
  up: 'var(--red)',
  down: 'var(--blu)',
  flat: 'var(--ink3)',
};
const CHANGE_ARROW: Record<'up' | 'down' | 'flat', string> = { up: '▲', down: '▼', flat: '–' };

/** 가격 옆 등락율 배지. */
function ChangeBadge({ trend }: { trend: number[] }) {
  const ch = changeFromTrend(trend);
  if (!ch) return null;
  return (
    <span
      style={{
        marginLeft: 6,
        fontFamily: 'var(--f1)',
        fontSize: 9,
        letterSpacing: 0.2,
        color: CHANGE_COLOR[ch.dir],
      }}
    >
      {CHANGE_ARROW[ch.dir]} {Math.abs(ch.pct).toFixed(1)}%
    </span>
  );
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
  if (c.src.snkrdunkApparelId) return `/cards/snkrdunk/${c.src.snkrdunkApparelId}`;
  return c.catalog ? `/cards/search?id=${encodeURIComponent(c.catalog.id)}` : '/my/cards';
}
