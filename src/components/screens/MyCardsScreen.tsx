'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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
import { PortfolioHero } from '@/components/PortfolioHero';
import { usePriceMode } from '@/components/PriceModeProvider';
import { useTheme } from '@/components/ThemeProvider';
import { isFlatTheme } from '@/lib/theme';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { CardSpotlightModal, type CardSpotlightData } from '@/components/CardSpotlightModal';
import { autoPriceSize } from '../../../shared/util/autoPriceSize';

type ViewMode = 'grid' | 'list' | 'album' | 'film';
type SortBy = 'name' | 'price' | 'grade' | 'recent';
type RarFilter = 'all' | Rarity;

interface Props {
  cards: MyCardWithPrice[];
  isLoggedIn?: boolean;
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
  /** 등록 시점 싱글 시세(JPY) 기준값 — 등락률 계산용. 없으면 null. */
  registerJpy: number | null;
  /** PSA10 모드인데 PSA10 시세가 없는 경우 — 가격 자리에 '-' 표기. */
  psa10Missing: boolean;
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

export function MyCardsScreen({ cards: initial, isLoggedIn = true }: Props) {
  const { format } = useCurrency();
  const { mode: priceMode } = usePriceMode();
  const { theme } = useTheme();
  const isClean = isFlatTheme(theme);
  const [cards, setCards] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [game, setGame] = useState('전체');
  const [rar, setRar] = useState<RarFilter>('all');
  const [sort, setSort] = useState<SortBy>('recent');
  const [tab, setTab] = useState<'mine' | 'fav'>('mine'); // 내 카드 / 관심카드
  // 스니덩 카드(apparelId 有, 서버 trend 비어있음)는 sales-chart API로 추이를 받아 채움.
  const [snkrTrends, setSnkrTrends] = useState<Record<number, number[]>>({});
  // 카드 스포트라이트 모달 — 🔍 버튼 누르면 카드가 풀스크린으로 회전하며 펼쳐짐.
  const [spotlight, setSpotlight] = useState<{ data: CardSpotlightData; origin: DOMRect | null } | null>(null);
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
          price: priceMode === 'psa10' ? 0 : c.latestPrice,
          // PSA10 모드: PSA10 시세만 사용(없으면 '-'). 싱글 모드: single/USD.
          priceJpy:
            priceMode === 'psa10'
              ? (c.pricePsa10Jpy > 0 ? c.pricePsa10Jpy : 0)
              : c.priceSingleJpy ?? c.snkrdunkMinPriceJpy ?? 0,
          psa10Missing: priceMode === 'psa10' && !(c.pricePsa10Jpy > 0),
          registerJpy: c.registerPriceJpy != null && c.registerPriceJpy > 0 ? c.registerPriceJpy : null,
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

  // 🔍 클릭 시 호출 — 썸네일 element 의 화면상 사각형을 캡처해 모달에 넘긴다.
  // 모달의 FLIP 애니메이션이 그 사각형 위치에서 풀스크린으로 회전 확대됨.
  const openSpotlight = useCallback(
    (c: DisplayCard, originEl: HTMLElement | null) => {
      const trend = c.src.trend && c.src.trend.length >= 2
        ? c.src.trend
        : c.src.snkrdunkApparelId != null
          ? (snkrTrends[c.src.snkrdunkApparelId] ?? [])
          : [];
      const label = priceLabel(c, format);
      const subtitleParts: string[] = [];
      if (c.src.ocrSetCode) subtitleParts.push(c.src.ocrSetCode);
      if (c.src.ocrCardNumber) subtitleParts.push(c.src.ocrCardNumber);
      if (c.rar) subtitleParts.push(c.rar);
      const currencySymbol = c.priceJpy > 0 ? '¥' : c.price > 0 ? '$' : '';
      const data: CardSpotlightData = {
        imageUrl: c.imageUrl,
        emojiFallback: c.catalog?.emoji ?? '🃏',
        name: c.name,
        subtitle: subtitleParts.join(' · ') || undefined,
        gradeLabel: c.src.gradeEstimate ?? null,
        priceLabel: label,
        trend,
        currencySymbol,
      };
      setSpotlight({ data, origin: originEl?.getBoundingClientRect() ?? null });
    },
    [snkrTrends, format],
  );

  const onDelete = (id: number) => {
    if (pending) return;
    if (!confirm('내 컬렉션에서 삭제하시겠습니까?')) return;
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
      {/* 토탈 포트폴리오 — 컬렉션 상단에는 메인 설정과 무관하게 항상 노출. */}
      <PortfolioHero cards={cards} isLoggedIn={isLoggedIn} />

      <div style={{ height: 12 }} />

      {/* 내 카드 / 관심카드 탭 */}
      <div className="cv-subseg" style={{ marginBottom: 10 }}>
        <button type="button" className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
          내 카드
        </button>
        <button type="button" className={tab === 'fav' ? 'on' : ''} onClick={() => setTab('fav')}>
          ★ 관심카드
        </button>
      </div>

      {tab === 'fav' ? (
        <FavoritesView />
      ) : (
      <>

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

      {/* Search */}
      <div className="cv-search">
        <span style={{ fontSize: 15 }}>🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="카드명, 게임 검색..."
        />
      </div>

      {/* 필터·정렬(드롭다운) + 보기방식(아이콘) — 한 줄 */}
      <CollectionControls
        games={games}
        presentRarities={RARITY_ORDER.filter((r) => display.some((c) => c.rar === r))}
        game={game}
        rar={rar}
        sort={sort}
        setGame={setGame}
        setRar={setRar}
        setSort={setSort}
        view={view}
        setView={setView}
        isClean={isClean}
      />

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
        <GridView cards={filtered} onDelete={onDelete} onSpotlight={openSpotlight} />
      ) : view === 'list' ? (
        <ListView cards={filtered} onDelete={onDelete} snkrTrends={snkrTrends} onSpotlight={openSpotlight} />
      ) : view === 'album' ? (
        <AlbumView cards={filtered} onSpotlight={openSpotlight} />
      ) : (
        <FilmView cards={filtered} onSpotlight={openSpotlight} />
      )}

      </div>{/* /overflow guard */}
      </>
      )}

      <div className="bggap" />

      {/* 🔍 카드 스포트라이트 — 풀스크린 회전 확대 모달 */}
      <CardSpotlightModal
        data={spotlight?.data ?? null}
        origin={spotlight?.origin ?? null}
        onClose={() => setSpotlight(null)}
      />
    </>
  );
}

/* ---------------- 필터 · 정렬 드롭다운 ---------------- */

const SORT_LABEL: Record<SortBy, string> = { recent: '최근', name: '이름', price: '가격', grade: '등급' };

const viewIcon = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function GridIcon() {
  return (
    <svg {...viewIcon}>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg {...viewIcon}>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function AlbumIcon() {
  return (
    <svg {...viewIcon}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.4" />
      <path d="m4 18 5-4 3 2 3-3 5 5" />
    </svg>
  );
}
function FilmIcon() {
  return (
    <svg {...viewIcon}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 9h2M4 13h2M4 17h2M18 9h2M18 13h2M18 17h2" />
      <path d="M9 4v16" />
      <path d="M15 4v16" />
    </svg>
  );
}

const VIEW_MODES: Array<[ViewMode, ReactNode, string]> = [
  ['grid', <GridIcon key="g" />, '바둑판'],
  ['list', <ListIcon key="l" />, '리스트'],
  ['album', <AlbumIcon key="a" />, '앨범'],
  ['film', <FilmIcon key="f" />, '필름'],
];

/**
 * 필터·정렬(드롭다운) + 보기방식(아이콘)을 한 줄에 배치한 컬렉션 컨트롤 바.
 * - 왼쪽: 작은 '필터·정렬' 버튼 — 누르면 게임/등급/정렬 패널이 한 줄 전체 폭으로 펼쳐짐.
 *   (여러 항목 연속 선택 가능 — 항목 선택으론 안 닫히고 토글·바깥 클릭으로만 닫힘.)
 * - 오른쪽: 바둑판/리스트/앨범/필름 아이콘 세그먼트.
 */
function CollectionControls({
  games,
  presentRarities,
  game,
  rar,
  sort,
  setGame,
  setRar,
  setSort,
  view,
  setView,
  isClean,
}: {
  games: string[];
  presentRarities: Rarity[];
  game: string;
  rar: RarFilter;
  sort: SortBy;
  setGame: (g: string) => void;
  setRar: (r: RarFilter) => void;
  setSort: (s: SortBy) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  isClean: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const segWrap = isClean
    ? { border: '1px solid var(--pap3)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }
    : { boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)' };

  return (
    <div ref={ref} style={{ position: 'relative', margin: '0 var(--gap) 10px' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 8 }}>
        {/* 작은 필터·정렬 버튼 */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 10px',
            cursor: 'pointer',
            background: open ? (isClean ? 'var(--accent)' : 'var(--ink)') : 'var(--white)',
            color: open ? (isClean ? 'var(--white)' : 'var(--gold)') : 'var(--ink)',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            letterSpacing: 0.5,
            ...(isClean
              ? { border: '1px solid var(--pap3)', borderRadius: 'var(--r-sm)' }
              : { boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)' }),
          }}
        >
          <span>필터·정렬</span>
          <span style={{ fontSize: 8, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
        </button>

        {/* 보기방식 아이콘 세그먼트 */}
        <div style={{ display: 'flex', ...segWrap }}>
          {VIEW_MODES.map(([k, icon, label], i) => {
            const on = view === k;
            return (
              <button
                key={k}
                type="button"
                aria-label={label}
                title={label}
                onClick={() => setView(k)}
                style={{
                  width: 34,
                  display: 'grid',
                  placeItems: 'center',
                  padding: '6px 0',
                  border: 0,
                  cursor: 'pointer',
                  background: on ? (isClean ? 'var(--accent)' : 'var(--ink)') : 'var(--white)',
                  color: on ? (isClean ? 'var(--white)' : 'var(--gold)') : 'var(--ink3)',
                  borderRight: i < VIEW_MODES.length - 1 ? `1px solid ${isClean ? 'var(--pap3)' : 'var(--ink)'}` : 'none',
                }}
              >
                {icon}
              </button>
            );
          })}
        </div>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 40,
            background: 'var(--white)',
            padding: '12px 12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            ...(isClean
              ? { border: '1px solid var(--pap3)', borderRadius: 'var(--r)', boxShadow: '0 6px 20px rgba(24,34,58,.12)' }
              : { boxShadow: '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)' }),
          }}
        >
          <FilterGroup label="게임">
            {games.map((g) => (
              <FilterOpt key={g} on={game === g} onClick={() => setGame(g)} label={g === '전체' ? '전체' : g} />
            ))}
          </FilterGroup>
          <FilterGroup label="등급">
            <FilterOpt on={rar === 'all'} onClick={() => setRar('all')} label="전체" />
            {presentRarities.map((r) => (
              <FilterOpt key={r} on={rar === r} onClick={() => setRar(r)} label={r} />
            ))}
          </FilterGroup>
          <FilterGroup label="정렬">
            {(['recent', 'name', 'price', 'grade'] as SortBy[]).map((s) => (
              <FilterOpt key={s} on={sort === s} onClick={() => setSort(s)} label={SORT_LABEL[s]} />
            ))}
          </FilterGroup>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{children}</div>
    </div>
  );
}

function FilterOpt({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className={`cv-chip${on ? ' on' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

/* ---------------- favorites (관심카드) ---------------- */

interface FavRow {
  id: number;
  snkrdunkApparelId: number;
  name: string | null;
  imageUrl: string | null;
  minPriceJpy: number;
}

function FavoritesView() {
  const { format } = useCurrency();
  const { theme } = useTheme();
  const isClean = isFlatTheme(theme);
  const [rows, setRows] = useState<FavRow[]>([]);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/me/favorites/with-prices', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!alive) return;
        if (!r.ok) {
          setState('error');
          return;
        }
        const j = (await r.json()) as { data?: FavRow[] };
        setRows(j.data ?? []);
        setState('done');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'loading') {
    return <div className="cv-empty">관심카드 불러오는 중…</div>;
  }
  if (state === 'error') {
    return <div className="cv-empty">관심카드를 불러오지 못했어요</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="cv-empty">
        관심카드가 없어요
        <br />
        <Link href="/cards/snkrdunk" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
          시세에서 ★ 로 추가해보세요
        </Link>
      </div>
    );
  }
  return (
    <div className="sect">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {rows.map((f) => {
          const has = f.minPriceJpy > 0;
          return (
            <Link
              key={f.id}
              href={`/cards/snkrdunk/${f.snkrdunkApparelId}`}
              className="pack-grid-card"
              style={isClean ? {} : { borderTop: '4px solid var(--gold)' }}
            >
              <div style={{ aspectRatio: '63 / 88', background: 'var(--pap2)', overflow: 'hidden' }}>
                {f.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.imageUrl}
                    alt={f.name ?? ''}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                    <span style={{ fontSize: 37 }}>🃏</span>
                  </div>
                )}
              </div>
              <div style={{ padding: '7px 8px 9px', borderTop: isClean ? '1px solid var(--pap3)' : '3px solid var(--ink)' }}>
                <div
                  style={{
                    fontFamily: 'var(--f1)', fontSize: 10, letterSpacing: 0.2, marginBottom: 5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', minHeight: 28, lineHeight: 1.45, wordBreak: 'keep-all',
                  }}
                >
                  {f.name ?? '관심 카드'}
                </div>
                <div
                  style={{
                    display: 'inline-block', maxWidth: '100%', padding: '3px 6px',
                    background: has ? (isClean ? 'var(--accent)' : 'var(--ink)') : 'var(--pap2)',
                    color: has ? (isClean ? 'var(--white)' : 'var(--gold)') : 'var(--ink3)',
                    fontFamily: 'var(--f1)', fontSize: 10, letterSpacing: 0.3, whiteSpace: 'nowrap',
                    ...(isClean
                      ? { borderRadius: 'var(--r-sm)' }
                      : { boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)' }),
                  }}
                >
                  {has ? format(f.minPriceJpy) : '시세 없음'}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- views ---------------- */

function GridView({
  cards,
  onDelete,
  onSpotlight,
}: {
  cards: DisplayCard[];
  onDelete: (id: number) => void;
  onSpotlight: (c: DisplayCard, originEl: HTMLElement | null) => void;
}) {
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
          <GridItem key={c.src.id} c={c} onDelete={onDelete} onSpotlight={onSpotlight} />
        ))}
      </div>
    </div>
  );
}

function GridItem({
  c,
  onDelete,
  onSpotlight,
}: {
  c: DisplayCard;
  onDelete: (id: number) => void;
  onSpotlight: (c: DisplayCard, originEl: HTMLElement | null) => void;
}) {
  const { format } = useCurrency();
  const { theme } = useTheme();
  const isClean = isFlatTheme(theme);
  const label = priceLabel(c, format);
  const hasPrice = label !== null;
  return (
    <div className="pack-grid-card" style={{ minWidth: 0, position: 'relative', ...(isClean ? {} : { borderTop: `4px solid ${gameAccent(c.game)}` }) }}>
      <Link
        href={detailHref(c)}
        style={{ display: 'block', textDecoration: 'none', color: 'inherit', position: 'relative' }}
      >
        <div
          className="cv-spot-origin"
          style={{ aspectRatio: '63 / 88', background: 'var(--pap2)', overflow: 'hidden' }}
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
              <span style={{ fontSize: 37 }}>{c.catalog?.emoji ?? '🃏'}</span>
            </div>
          )}
          {c.src.memo && <div className="cv-coll-noteflag" title={c.src.memo}>📝</div>}
        </div>
        <div style={{ padding: '7px 8px 6px', borderTop: isClean ? '1px solid var(--pap3)' : '3px solid var(--ink)' }}>
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
              maxWidth: '100%',
              padding: '3px 6px',
              background: hasPrice ? (isClean ? 'var(--accent)' : 'var(--ink)') : 'var(--pap2)',
              color: hasPrice ? (isClean ? 'var(--white)' : 'var(--gold)') : 'var(--ink3)',
              fontFamily: 'var(--f1)',
              fontSize: autoPriceSize(hasPrice ? label : null, 11, 8),
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
              ...(isClean
                ? { borderRadius: 'var(--r-sm)' }
                : { boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)' }),
            }}
          >
            {hasPrice ? label : '시세 없음'}
          </div>
        </div>
      </Link>
      {/* 🔍 카드 스포트라이트 floating 버튼 — 이미지 우상단 */}
      <SpotlightButton onPress={(btn) => onSpotlight(c, btn.closest('.pack-grid-card')?.querySelector('.cv-spot-origin') as HTMLElement | null)} />
      <div style={{ display: 'flex', borderTop: isClean ? '1px solid var(--pap3)' : '3px solid var(--ink)' }}>
        <Link
          href={`/write/trade?userCardId=${c.src.id}`}
          style={{
            flex: 1,
            padding: '6px 0',
            textAlign: 'center',
            background: 'var(--ink)',
            color: 'var(--gold)',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            letterSpacing: 0.3,
            textDecoration: 'none',
            borderRight: '2px solid var(--ink)',
          }}
        >
          거래
        </Link>
        <button
          type="button"
          onClick={() => onDelete(c.src.id)}
          style={{
            flex: 1,
            padding: '6px 0',
            background: 'var(--white)',
            color: 'var(--red)',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            letterSpacing: 0.3,
            border: 0,
            cursor: 'pointer',
          }}
        >
          ✕ 삭제
        </button>
      </div>
    </div>
  );
}

/**
 * 🔍 카드 스포트라이트 trigger 버튼.
 * 컬렉션 카드 우상단에 floating 으로 얹는다. 클릭하면 같은 카드 컨테이너
 * 안의 썸네일(`.cv-spot-origin`) 사각형을 기준으로 풀스크린 모달이 열림.
 */
function SpotlightButton({ onPress }: { onPress: (btn: HTMLElement) => void }) {
  return (
    <button
      type="button"
      aria-label="카드 자세히 보기"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPress(e.currentTarget);
      }}
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        width: 28,
        height: 28,
        background: 'var(--ink)',
        color: 'var(--gold)',
        border: 0,
        fontSize: 13,
        cursor: 'pointer',
        zIndex: 2,
        boxShadow:
          '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink),2px 2px 0 var(--gold)',
      }}
    >
      🔍
    </button>
  );
}

function ListView({
  cards,
  onDelete,
  snkrTrends,
  onSpotlight,
}: {
  cards: DisplayCard[];
  onDelete: (id: number) => void;
  snkrTrends: Record<number, number[]>;
  onSpotlight: (c: DisplayCard, originEl: HTMLElement | null) => void;
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
        const rc = registerChange(c);
        return (
        <div key={c.src.id} className="cv-list-card" style={{ minWidth: 0 }}>
          {/* 썸네일 클릭 → 스포트라이트(돋보기) 모달 */}
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => onSpotlight(c, e.currentTarget)}
            className="cv-list-thumb cv-spot-origin"
            data-card-id={c.src.id}
            style={{
              background: gameBg(c.game),
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
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
          {/* 본문 클릭 → 스포트라이트(돋보기) 모달 */}
          <div
            className="cv-lc-body"
            onClick={(e) => {
              const thumb = (e.currentTarget.closest('.cv-list-card') as HTMLElement | null)
                ?.querySelector('.cv-spot-origin') as HTMLElement | null;
              onSpotlight(c, thumb);
            }}
            style={{ cursor: 'pointer' }}
          >
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
            {/* 등록가 / 현재가 / 등락률 — 3줄. 값 없으면 '-'. */}
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <PriceRow label="등록가" value={c.registerJpy != null ? format(c.registerJpy) : '-'} />
              <PriceRow label="현재가" value={c.priceJpy > 0 ? format(c.priceJpy) : '-'} valueColor="var(--grn-dk)" />
              <PriceRow
                label="등락률"
                value={rc ? `${CHANGE_ARROW[rc.dir]} ${Math.abs(rc.pct).toFixed(1)}%` : '-'}
                valueColor={rc ? CHANGE_COLOR[rc.dir] : 'var(--ink3)'}
              />
            </div>
          </div>

          {/* 우측: ⋯ 메뉴(거래하기/삭제) 위, 그 아래 최근 추이 차트 */}
          <div
            style={{
              flexShrink: 0,
              alignSelf: 'stretch',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            <RowMenu tradeHref={`/write/trade?userCardId=${c.src.id}`} onDelete={() => onDelete(c.src.id)} />
            {trend.length >= 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <MiniSparkline points={trend} />
                <span style={{ fontFamily: 'var(--f1)', fontSize: 7, color: 'var(--ink3)', letterSpacing: 0.2 }}>
                  최근 추이
                </span>
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}

/** 리스트 가격 행 — "라벨: 값" 한 줄. 값 없으면 호출부에서 '-' 를 넘김. */
function PriceRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', letterSpacing: 0.2, minWidth: 32 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--f1)', fontSize: 11, color: valueColor ?? 'var(--ink)', letterSpacing: 0.3 }}>
        {value}
      </span>
    </div>
  );
}

/** 리스트 행 우상단 ⋯ 메뉴 — 거래하기 / 삭제 드롭다운. 바깥 클릭 시 닫힘. */
function RowMenu({ tradeHref, onDelete }: { tradeHref: string; onDelete: () => void }) {
  const { theme } = useTheme();
  const isClean = isFlatTheme(theme);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const itemStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    fontFamily: 'var(--f1)',
    fontSize: 10,
    letterSpacing: 0.3,
    textAlign: 'left',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="더보기"
        style={{
          width: 28,
          height: 22,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          fontSize: 15,
          lineHeight: 1,
          color: 'var(--ink)',
          background: 'var(--white)',
          ...(isClean
            ? { border: '1px solid var(--pap3)', borderRadius: 'var(--r-sm)' }
            : { boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)' }),
        }}
      >
        ⋯
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 30,
            minWidth: 92,
            background: 'var(--white)',
            overflow: 'hidden',
            ...(isClean
              ? { border: '1px solid var(--pap3)', borderRadius: 'var(--r-sm)', boxShadow: '0 6px 18px rgba(24,34,58,.14)' }
              : { boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)' }),
          }}
        >
          <Link href={tradeHref} onClick={() => setOpen(false)} style={{ ...itemStyle, color: 'var(--ink)' }}>
            거래하기
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            style={{ ...itemStyle, color: 'var(--red)', borderTop: '1px solid var(--pap3)' }}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

/** 앨범: 이미지만 — 텍스트 없이 3열 그리드. 카드 사진만 한눈에 보기. */
function AlbumView({
  cards,
  onSpotlight,
}: {
  cards: DisplayCard[];
  onSpotlight: (c: DisplayCard, originEl: HTMLElement | null) => void;
}) {
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
          <div key={c.src.id} style={{ position: 'relative', minWidth: 0 }}>
            <Link
              href={detailHref(c)}
              className="cv-spot-origin"
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
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
            <SpotlightButton
              onPress={(btn) =>
                onSpotlight(c, btn.parentElement?.querySelector('.cv-spot-origin') as HTMLElement | null)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 필름: 가로 스크롤 한 줄. 컨테이너 안에서만 스크롤 — 페이지 자체는 안 넘어감. */
function FilmView({
  cards,
  onSpotlight,
}: {
  cards: DisplayCard[];
  onSpotlight: (c: DisplayCard, originEl: HTMLElement | null) => void;
}) {
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
          <div key={c.src.id} style={{ position: 'relative', flexShrink: 0, width: 92 }}>
          <Link
            href={detailHref(c)}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              className="cv-spot-origin"
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
          <SpotlightButton
            onPress={(btn) =>
              onSpotlight(c, btn.parentElement?.querySelector('.cv-spot-origin') as HTMLElement | null)
            }
          />
          </div>
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
  if (c.psa10Missing) return '-'; // PSA10 모드인데 PSA10 시세 없음
  if (c.price > 0) return `$${fmtUsd(c.price)}`;
  if (c.priceJpy > 0) return format(c.priceJpy);
  return null;
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

/** 등록가(registerJpy) 대비 현재 싱글 시세(priceJpy) 등락율. 기준/현재가 없으면 null. */
function registerChange(c: DisplayCard): { pct: number; dir: 'up' | 'down' | 'flat' } | null {
  const reg = c.registerJpy;
  const cur = c.priceJpy;
  if (reg == null || !(reg > 0) || !(cur > 0)) return null;
  const pct = ((cur - reg) / reg) * 100;
  const dir = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { pct, dir };
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
