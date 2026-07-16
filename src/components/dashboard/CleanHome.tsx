'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { useCurrency } from '@/components/CurrencyProvider';
import { useUnread } from '@/components/UnreadProvider';
import { useTheme } from '@/components/ThemeProvider';
import { useGamePrefs } from '@/components/GamePrefsProvider';
import type { GameId } from '@/lib/gamePrefs';
import { HeroSlider, type HeroSlideData } from '@/components/HeroSlider';
import { HomeKoSearchBar } from '@/components/HomeKoSearchBar';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import type { SnkrdunkRow } from '@/components/dashboard/DashboardScreen';
import type { MvcAuctionItem } from '@/lib/navercafe';

/**
 * 메인화면 — Claude Design 'ARVOTCG App' 프로토타입 레이아웃.
 *  헤더(ARVOTCG+벨) · 검색 · 프로모 배너 · 빠른 스캔 · HOT 카드 · 박스 힛카드 · 실시간 급등.
 * 모든 테마가 같은 레이아웃을 쓰고, 색/폰트만 테마별로 달라진다(클린은 프로토타입 오렌지
 * 팔레트 그대로, 그 외 테마는 CSS 변수 토큰). 카드 아트는 컨테이너 없이 이미지만 떠 보이게.
 */

const ACCENT30 = '#FF7A00'; // ARVO'TCG' 브랜드 액센트 — 모든 테마 공통
const RISE = '#F5333F';

export interface Palette {
  bg: string;
  ink: string;
  ink2: string;
  ink3: string;
  rise: string;
  fall: string;
  priceIcon: string;
  regIcon: string;
  searchBg: string;
  tileBg: string;
  line: string;
  chev: string;
}

const FALL = '#2C8FFF';

/** 등락률 표시 정보. 데이터 없으면 null. */
function pctInfo(pct: number | undefined, P: Palette): { text: string; color: string } | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  const up = pct >= 0;
  return { text: `${up ? '+' : ''}${pct.toFixed(1)}% ${up ? '▲' : '▼'}`, color: up ? P.rise : P.fall };
}

// 클린 = 프로토타입 오렌지 팔레트(승인된 모습 그대로).
const CLEAN_PALETTE: Palette = {
  bg: '#ffffff',
  ink: '#16161a',
  ink2: '#8E8E93',
  ink3: '#9A9AA0',
  rise: RISE,
  fall: FALL,
  priceIcon: ACCENT30,
  regIcon: '#5FB85A',
  searchBg: '#F2F2F4',
  tileBg: '#F7F7F9',
  line: '#F0F0F2',
  chev: '#C2C2C8',
};

// 그 외 테마 = 각 테마의 CSS 변수 토큰(테마별 색/폰트 자동 반영).
const VAR_PALETTE: Palette = {
  bg: 'var(--paper)',
  ink: 'var(--ink)',
  ink2: 'var(--ink3)',
  ink3: 'var(--ink3)',
  rise: 'var(--red)',
  fall: 'var(--blu)',
  priceIcon: 'var(--gold)',
  regIcon: 'var(--grn)',
  searchBg: 'var(--pap2)',
  tileBg: 'var(--pap2)',
  line: 'var(--pap3)',
  chev: 'var(--ink3)',
};

// 카드 아트 폴백 그라데이션 (이미지가 없을 때만)
const FALLBACK_GRADS = [
  'linear-gradient(150deg,#f9d423,#ff8a3c)',
  'linear-gradient(150deg,#ff6a3d,#c81d25)',
  'linear-gradient(150deg,#f7a6c4,#b78cf0)',
  'linear-gradient(150deg,#9d6bd6,#4568dc)',
  'linear-gradient(150deg,#3a3a44,#16161a)',
  'linear-gradient(150deg,#7ad0c2,#2f8f7f)',
];

function rankBadgeColor(rank: number): string {
  if (rank === 1) return RISE;
  if (rank === 3) return ACCENT30;
  return '#2B2B2B';
}

// 설정에서 켠 게임별 인기 카드/박스 검색 키워드. 포켓몬은 서버 기본 rows 를 그대로 쓴다.
const GAME_POPULAR_KEYWORD: Partial<Record<GameId, string>> = {
  onepiece: 'ワンピースカード',
  yugioh: '遊戯王',
  sports: 'Topps',
};
const GAME_BOX_KEYWORD: Partial<Record<GameId, string>> = {
  onepiece: 'ワンピースカード ボックス',
  yugioh: '遊戯王 ボックス',
  sports: 'Topps ボックス',
};
const BOX_NAME_RE = /ボックス|box|booster|ブースター|デッキビルド|スターター|拡張パック|ハイクラスパック|ポケモンセンターセット|シュリンク/i;
const isBoxName = (name: string) => BOX_NAME_RE.test(name || '');

interface PopularSearchHit {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  priceText: string;
}

function shuffleRows<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 게임별 목록을 라운드로빈으로 섞어 한 캐러셀에 고르게 배치. */
function interleaveRows<T>(pools: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...pools.map((p) => p.length));
  for (let i = 0; i < max; i++) {
    for (const p of pools) {
      if (i < p.length) out.push(p[i]);
    }
  }
  return out;
}

function searchHitToRow(r: PopularSearchHit): SnkrdunkRow {
  const ko = translateKnownCardNameToKo(r.name) || r.name;
  const cut = ko.split(/[|｜]/)[0].trim();
  return {
    apparelId: r.apparelId,
    shortName: cut.length > 22 ? cut.slice(0, 21) + '…' : cut,
    localizedName: r.name,
    category: null,
    imageUrl: r.imageUrl,
    minPrice: Number((r.priceText ?? '').replace(/[^\d]/g, '')) || 0,
    listingCountText: '',
  };
}

interface Props {
  heroBanners?: HeroSlideData[];
  isLoggedIn: boolean;
  snkrdunkRows?: SnkrdunkRow[];
  snkrdunkBoxRows?: SnkrdunkRow[];
  mvcAuctions?: MvcAuctionItem[];
}

/** 캐러셀 자동 좌측 무한 스크롤(로테이션). 손대면 멈췄다 이어감. */
function useMarquee(ref: RefObject<HTMLDivElement>, enabled: boolean, depCount: number) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let paused = false;
    let acc = el.scrollLeft;
    let last = 0;
    const pause = () => { paused = true; };
    const resume = () => { paused = false; acc = el.scrollLeft; };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', resume, { passive: true });
    const step = (t: number) => {
      if (!paused && el.scrollWidth > el.clientWidth) {
        const dt = last ? t - last : 16;
        const half = el.scrollWidth / 2; // 카드를 두 벌 이어붙였으므로 절반에서 되돌림
        acc += (dt / 1000) * 28; // ~28px/s
        if (half > 0 && acc >= half) acc -= half;
        el.scrollLeft = acc;
      }
      last = t;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
    };
  }, [ref, enabled, depCount]);
}

const hrowStyle: CSSProperties = {
  display: 'flex',
  gap: 14,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  // overflow-x:auto 면 overflow-y 가 auto 로 계산돼 카드 그림자가 잘리므로
  // 상하 패딩으로 그림자가 들어갈 여백을 확보한다.
  padding: '10px 20px 26px',
};

function SectionHead({ title, href, P }: { title: ReactNode; href: string; P: Palette }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 13px' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: P.ink }}>{title}</div>
      <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: P.ink3, textDecoration: 'none' }}>
        더보기
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.ink3} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

// 컨테이너(박스) 없이 이미지 '자체'에 그림자를 준다 — drop-shadow 는 이미지의 알파(모양)를
// 따라가므로 둥근/투명 영역 그대로 그림자가 생겨 진짜 떠 있는 사진처럼 보인다.
const ART_SHADOW = 'drop-shadow(0 7px 11px rgba(0,0,0,.30)) drop-shadow(0 2px 4px rgba(0,0,0,.18))';

function CardArt({
  imageUrl,
  fallbackIdx,
  width,
  height,
  radius,
  children,
}: {
  imageUrl: string | null;
  fallbackIdx: number;
  width: number | string;
  height: number;
  radius: number;
  children?: ReactNode;
}) {
  return (
    <div style={{ position: 'relative', width, height }}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius, filter: ART_SHADOW }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: radius,
            background: FALLBACK_GRADS[fallbackIdx % FALLBACK_GRADS.length],
            filter: ART_SHADOW,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 40 }}>🃏</span>
        </div>
      )}
      {children}
    </div>
  );
}

export function CleanHome({ heroBanners, snkrdunkRows = [], snkrdunkBoxRows = [] }: Props) {
  const { format } = useCurrency();
  const { count: unread } = useUnread();
  const { theme } = useTheme();
  const P = theme === 'clean' ? CLEAN_PALETTE : VAR_PALETTE;
  // 빠른 스캔 타일을 픽셀 입체 박스로 — 웹 .card 가 픽셀로 남는 테마(pokemon·sports)에만.
  // (yugioh·onepiece·clean·dark 는 globals.css 에서 .card 를 플랫 처리하므로 제외.)
  const pixelTiles = theme === 'pokemon' || theme === 'sports';
  // 픽셀 폰트(Press Start 2P/Galmuri) 테마 — 폰트 폭이 넓어 가격·등락률 글씨를 줄인다.
  const pixel = pixelTiles;

  const fmtPrice = (jpy: number) => (jpy > 0 ? format(jpy) : '—');

  // 설정에서 켠 게임들의 인기 카드/박스를 조회해 섞는다 (테마와 무관).
  // 포켓몬은 서버 기본 rows 사용, 나머지 게임은 키워드 검색으로 조회.
  // 포켓몬만 켜져 있으면 조회 없이 서버 rows 그대로 (기존 기본 동작과 동일).
  const { enabledGames } = useGamePrefs();
  const gamesKey = enabledGames.join(',');
  const extraGames = enabledGames.filter((g) => GAME_POPULAR_KEYWORD[g]);
  const needsMix = extraGames.length > 0;
  const [mixPopular, setMixPopular] = useState<Record<string, SnkrdunkRow[]>>({});
  const [mixBox, setMixBox] = useState<Record<string, SnkrdunkRow[]>>({});
  useEffect(() => {
    if (!needsMix || (mixPopular[gamesKey] && mixBox[gamesKey])) return;
    let alive = true;
    // 게임당 뽑는 개수 — 섞어도 캐러셀이 과하게 길어지지 않게 켠 게임 수로 나눔.
    const per = Math.max(2, Math.ceil(8 / enabledGames.length));
    const search = async (q: string): Promise<PopularSearchHit[]> => {
      try {
        const r = await fetch(`/api/snkrdunk/search?q=${encodeURIComponent(q)}`);
        if (!r.ok) return [];
        const j = (await r.json()) as { results?: PopularSearchHit[] };
        return j.results ?? [];
      } catch {
        return [];
      }
    };
    (async () => {
      const [popularLists, boxLists] = await Promise.all([
        Promise.all(
          extraGames.map(async (g) =>
            shuffleRows((await search(GAME_POPULAR_KEYWORD[g]!)).filter((h) => !isBoxName(h.name)))
              .slice(0, per)
              .map(searchHitToRow),
          ),
        ),
        Promise.all(
          extraGames.map(async (g) =>
            shuffleRows((await search(GAME_BOX_KEYWORD[g]!)).filter((h) => isBoxName(h.name)))
              .slice(0, per)
              .map(searchHitToRow),
          ),
        ),
      ]);
      if (!alive) return;
      const withPokemon = (lists: SnkrdunkRow[][], pokemonRows: SnkrdunkRow[]) =>
        interleaveRows(
          enabledGames.includes('pokemon') ? [pokemonRows.slice(0, per), ...lists] : lists,
        ).slice(0, 10);
      const popRows = withPokemon(popularLists, snkrdunkRows);
      const boxRows2 = withPokemon(boxLists, snkrdunkBoxRows);
      if (popRows.length > 0) setMixPopular((p) => ({ ...p, [gamesKey]: popRows }));
      if (boxRows2.length > 0) setMixBox((p) => ({ ...p, [gamesKey]: boxRows2 }));
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamesKey, needsMix, snkrdunkRows, snkrdunkBoxRows]);

  const hotRows = (needsMix && mixPopular[gamesKey]) || snkrdunkRows;
  const boxRows = (needsMix && mixBox[gamesKey]) || snkrdunkBoxRows;
  // 실시간 급등 = 등락률 내림차순(데이터 없는 행은 뒤로). 이름값이 '급등'이도록 정렬.
  const moverRows = [...hotRows].sort(
    (a, b) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity),
  );

  // HOT / 박스 캐러셀 자동 슬라이딩(카드를 두 벌 이어붙여 끊김 없이 루프).
  const hotRef = useRef<HTMLDivElement>(null);
  const boxScrollRef = useRef<HTMLDivElement>(null);
  useMarquee(hotRef, hotRows.length > 0, hotRows.length);
  useMarquee(boxScrollRef, boxRows.length > 0, boxRows.length);
  const hotDisplay = hotRows.length > 0 ? [...hotRows, ...hotRows] : [];
  const boxDisplay = boxRows.length > 0 ? [...boxRows, ...boxRows] : [];

  return (
    <div style={{ fontFamily: 'var(--f1)', background: P.bg, minHeight: '100%' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 8px' }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.5px' }}>
          <span style={{ color: P.ink }}>ARVO</span>
          <span style={{ color: ACCENT30 }}>TCG</span>
        </div>
        <Link href="/my/messages" aria-label="알림" style={{ position: 'relative', display: 'block', color: P.ink }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={P.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unread > 0 && (
            <span style={{ position: 'absolute', top: 0, right: 1, width: 8, height: 8, background: RISE, borderRadius: '50%', border: '1.5px solid var(--paper)' }} />
          )}
        </Link>
      </div>

      {/* promo banner — 실제 배너 데이터(HeroSlider). 비면 컴포넌트 내장 폴백 슬라이드. */}
      <HeroSlider slides={heroBanners} compact />

      {/* search — 직접 타이핑 검색(Enter/▶ → /cards/snkrdunk/search?q=). 카메라 스캔은 인풋 내장. */}
      <div style={{ padding: '14px 20px' }}>
        <HomeKoSearchBar />
      </div>

      {/* quick scan */}
      <div style={{ padding: '8px 20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <QuickTile
            P={P}
            pixel={pixelTiles}
            href="/cards/add"
            label="내 카드 등록"
            desc="보유 카드를 등록하고 관리해요"
            icon={
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={P.regIcon} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M12 11v6M9 14h6" />
              </svg>
            }
          />
          <QuickTile
            P={P}
            pixel={pixelTiles}
            href="/cards/packs"
            label="시세 확인"
            desc="카드 시세를 바로 확인해요"
            icon={
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={P.priceIcon} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3.2" />
              </svg>
            }
          />
        </div>
      </div>

      {/* HOT cards */}
      {hotRows.length > 0 && (
        <div style={{ padding: '0 0 24px' }}>
          <SectionHead title="HOT 카드" href="/cards/snkrdunk" P={P} />
          <div ref={hotRef} style={hrowStyle}>
            {hotDisplay.map((c, i) => {
              const rank = (i % hotRows.length) + 1;
              return (
                <Link
                  key={`${c.apparelId}-${i}`}
                  href={`/cards/snkrdunk/${c.apparelId}`}
                  style={{ flex: 'none', width: 100, textDecoration: 'none', color: 'inherit' }}
                >
                  <CardArt imageUrl={c.imageUrl} fallbackIdx={i} width={100} height={138} radius={11}>
                    <div
                      style={{
                        position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: '50%',
                        background: rankBadgeColor(rank), color: '#fff', fontSize: 12, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,.25)',
                      }}
                    >
                      {rank}
                    </div>
                  </CardArt>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: P.ink, marginTop: 9, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.shortName}
                  </div>
                  <div
                    style={{
                      fontSize: pixel ? 13 : 15, fontWeight: 900, color: P.ink, marginTop: 4, letterSpacing: '-.3px',
                      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {fmtPrice(c.recentPrice ?? c.minPrice)}
                  </div>
                  {(() => {
                    const pc = pctInfo(c.changePct, P);
                    return pc ? (
                      <div style={{ fontSize: pixel ? 9 : 12, fontWeight: 800, color: pc.color, marginTop: 2, whiteSpace: 'nowrap' }}>{pc.text}</div>
                    ) : null;
                  })()}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* box hot cards */}
      {boxRows.length > 0 && (
        <div style={{ padding: '0 0 26px' }}>
          <SectionHead title="박스 힛카드" href="/cards/packs" P={P} />
          <div ref={boxScrollRef} style={hrowStyle}>
            {boxDisplay.map((b, i) => (
              <Link
                key={`${b.apparelId}-${i}`}
                href={`/cards/snkrdunk/${b.apparelId}`}
                style={{ flex: 'none', width: 100, textDecoration: 'none', color: 'inherit' }}
              >
                <CardArt imageUrl={b.imageUrl} fallbackIdx={i} width={100} height={100} radius={13} />
                <div style={{ fontSize: 12.5, fontWeight: 700, color: P.ink, marginTop: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.shortName}
                </div>
                <div style={{ fontSize: 11, color: P.ink2, marginTop: 3 }}>
                  평균 시세 <span style={{ color: P.rise, fontWeight: 800 }}>{fmtPrice(b.minPrice)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* realtime movers */}
      {hotRows.length > 0 && (
        <div style={{ padding: '0 20px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 18, fontWeight: 800, color: P.ink }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={P.rise} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 17 6-6 4 4 8-8" />
                <path d="M17 7h4v4" />
              </svg>
              실시간 급등 카드
            </div>
            <Link href="/cards/snkrdunk" style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: P.ink3, textDecoration: 'none' }}>
              더보기
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={P.ink3} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          </div>
          {moverRows.map((m, i) => {
            const sub = m.localizedName && m.localizedName !== m.shortName ? m.localizedName : m.category ?? '카드';
            const pc = pctInfo(m.changePct, P);
            return (
              <Link
                key={m.apparelId}
                href={`/cards/snkrdunk/${m.apparelId}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: `1px solid ${P.line}`, textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: i < 3 ? P.rise : P.ink, width: 14, textAlign: 'center' }}>{i + 1}</div>
                <CardArt imageUrl={m.imageUrl} fallbackIdx={i} width={46} height={46} radius={9} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.shortName}</div>
                  <div style={{ fontSize: 12, color: P.ink3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontSize: 14.5, fontWeight: 900, color: P.ink, letterSpacing: '-.3px', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(m.recentPrice ?? m.minPrice)}</div>
                  {pc ? <div style={{ fontSize: pixel ? 9.5 : 12.5, fontWeight: 800, color: pc.color, marginTop: 3, whiteSpace: 'nowrap' }}>{pc.text}</div> : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="bggap" />
    </div>
  );
}

function QuickTile({
  P,
  href,
  label,
  desc,
  icon,
  pixel,
}: {
  P: Palette;
  href: string;
  label: string;
  desc: string;
  icon: ReactNode;
  pixel?: boolean;
}) {
  // 픽셀 테마: .card 픽셀 박스 레시피(4면 ink 보더 + 하드 드롭섀도 + 노치 코너) + 클릭 시 눌림.
  // 플랫(클린·다크): 기존 라운드 소프트 타일.
  const baseStyle: CSSProperties = pixel
    ? { background: 'var(--white)', borderRadius: 0, padding: '16px 14px', textDecoration: 'none', color: 'inherit', display: 'block' }
    : { background: P.tileBg, borderRadius: 16, padding: '16px 14px', textDecoration: 'none', color: 'inherit', display: 'block' };
  return (
    <Link href={href} className={pixel ? 'qtile-pixel' : undefined} style={baseStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {icon}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.chev} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: P.ink, marginTop: 14 }}>{label}</div>
      <div style={{ fontSize: 12, color: P.ink2, marginTop: 3 }}>{desc}</div>
    </Link>
  );
}
