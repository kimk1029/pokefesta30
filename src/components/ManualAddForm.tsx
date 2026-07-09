'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { CardRegisterSheet, type RegisterCardInput } from '@/components/cards/CardRegisterSheet';
import { useTheme } from '@/components/ThemeProvider';
import { translate, translateKnownCardNameToKo } from '@/lib/cardTranslate';

/** snkrdunk 검색 결과 한 건. */
interface SnkSearchRow {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  priceText?: string;
}

/** "¥2,000" → 2000. 못 읽으면 null. */
function parseYen(t?: string): number | null {
  if (!t) return null;
  const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface CatalogOption {
  id: string;
  name: string;
  emoji: string;
  grade: 'S' | 'A' | 'B' | 'C';
}

interface Props {
  catalog: CatalogOption[];
}

/** /api/cards/lookup 응답의 card 부분 (필요한 필드만). */
interface LookupCard {
  id?: string;
  name?: string;
  localName?: string | null;
  setName?: string;
  setCode?: string;
  number?: string;
  rarity?: string;
  imageSmall?: string | null;
  imageLarge?: string | null;
  priceSummary?: {
    byRegion?: { jpy?: number | null; krw?: number | null } | null;
  } | null;
}

/* ── 팔레트: Claude Design 'POKE30 카드추가' 프로토타입.
   클린 = 프로토타입 색 그대로, 그 외 테마 = CSS 변수 토큰. ── */
interface Palette {
  pageBg: string;
  ink: string;
  ink2: string; // 라벨 (#8E8E93)
  ink3: string; // 보조 텍스트 (#9A9AA0)
  accent: string; // 오렌지 포인트
  accentSoft: string; // 선택 행 배경
  line: string; // 구분선 (#F0F0F2)
  fieldBg: string; // 입력 필드 배경 (#F7F7F9)
  fieldBd: string; // 입력 필드 테두리 (#E5E5EA)
  nameBg: string; // 카드이름 필드 배경 (#F2F2F4)
  radioBd: string; // 미선택 라디오 테두리 (#D2D2D8)
  btnBg: string; // 검정 버튼
  btnFg: string;
  disBg: string; // 비활성 버튼 배경
  disFg: string;
  barBg: string; // 하단 바 배경
}

const CLEAN_P: Palette = {
  pageBg: '#ffffff',
  ink: '#16161a',
  ink2: '#8E8E93',
  ink3: '#9A9AA0',
  accent: '#FF7A00',
  accentSoft: '#FFF6EE',
  line: '#F0F0F2',
  fieldBg: '#F7F7F9',
  fieldBd: '#E5E5EA',
  nameBg: '#F2F2F4',
  radioBd: '#D2D2D8',
  btnBg: '#16161a',
  btnFg: '#ffffff',
  disBg: '#F2F2F4',
  disFg: '#B0B0B6',
  barBg: 'rgba(255,255,255,.97)',
};

const VAR_P: Palette = {
  pageBg: 'var(--paper)',
  ink: 'var(--ink)',
  ink2: 'var(--ink2)',
  ink3: 'var(--ink3)',
  accent: 'var(--gold)',
  accentSoft: 'var(--pap2)',
  line: 'var(--pap3)',
  fieldBg: 'var(--pap2)',
  fieldBd: 'var(--pap3)',
  nameBg: 'var(--pap2)',
  radioBd: 'var(--ink3)',
  btnBg: 'var(--ink)',
  btnFg: 'var(--paper)',
  disBg: 'var(--pap2)',
  disFg: 'var(--ink3)',
  barBg: 'var(--paper)',
};

/* ── 아이콘 (프로토타입 SVG) ── */
function IcBack({ c }: { c: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}
function IcScan({ c }: { c: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v3M21 15v3a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-3" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IcSearch({ c, size = 18, w = 2.2 }: { c: string; size?: number; w?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function IcFilter({ c }: { c: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}
function IcCaret({ c, size = 14 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * 카드 추가(직접입력) — Claude Design 'POKE30 카드추가' 프로토타입 레이아웃.
 *  헤더(뒤로가기·스캔 버튼) + 세트코드/카드번호/카드이름 입력 + 카드 검색 →
 *  필터 칩 · 결과 리스트(단일 선택 라디오) · 하단 고정 "내 컬렉션에 추가" 바 →
 *  스캔과 동일한 "카드 등록" 시트로 진입.
 */
export function ManualAddForm(_props: Props) {
  const { theme } = useTheme();
  const clean = theme === 'clean';
  const P = clean ? CLEAN_P : VAR_P;

  const [setCode, setSetCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [name, setName] = useState('');

  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<RegisterCardInput[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [registering, setRegistering] = useState<RegisterCardInput | null>(null);
  // "더보기" 페이지네이션 상태 — 검색 쿼리/중복셋/다음 페이지를 유지해 이어서 로드.
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pagingRef = useRef<{ queries: string[]; seen: Set<number>; nextPage: number }>({
    queries: [],
    seen: new Set(),
    nextPage: 1,
  });

  /** snkrdunk 한 페이지 로드 — 새 항목만 반환. */
  const fetchSnkPage = async (queries: string[], page: number, seen: Set<number>) => {
    const items: RegisterCardInput[] = [];
    let anyRows = false;
    for (const q of queries) {
      if (!q) continue;
      try {
        const sr = await fetch(`/api/snkrdunk/search?q=${encodeURIComponent(q)}&page=${page}`, {
          cache: 'no-store',
        });
        const sj = (await sr.json().catch(() => null)) as { results?: SnkSearchRow[] } | null;
        const rows = sj?.results ?? [];
        if (rows.length > 0) anyRows = true;
        for (const row of rows) {
          if (!row?.apparelId || seen.has(row.apparelId)) continue;
          seen.add(row.apparelId);
          items.push({
            snkrdunkApparelId: row.apparelId,
            // 일본어 원문 → 한국어(사전+음역) — 결과 리스트/등록 별칭 모두 한글로.
            name: translateKnownCardNameToKo(row.name) || row.name,
            imageUrl: row.imageUrl ?? null,
            currentPriceJpy: parseYen(row.priceText),
            setCode: setCode.trim() || null,
            cardNumber: cardNumber.trim() || null,
          });
        }
      } catch {
        // snkrdunk 실패는 무시 — lookup/다른 쿼리 결과만으로도 진행
      }
    }
    return { items, anyRows };
  };

  const runSearch = async () => {
    if (searching) return;
    setErr(null);
    const hasCode = !!setCode.trim() && !!cardNumber.trim();
    const hasName = !!name.trim();
    // 세트코드+번호 또는 카드 이름 중 하나만 있으면 검색 가능.
    if (!hasCode && !hasName) {
      setErr('세트코드+카드번호 또는 카드이름을 입력해 주세요');
      return;
    }
    setSearching(true);
    setSearched(false);
    setResults([]);
    setSelectedIdx(null);
    setHasMore(false);
    try {
      const list: RegisterCardInput[] = [];

      // 1) TCGdex 정확 매칭 (setCode-번호) + 로컬 DB — 코드+번호가 있을 때만.
      if (hasCode) {
        const qs = new URLSearchParams({ setCode: setCode.trim(), number: cardNumber.trim() });
        if (name.trim()) qs.set('name', name.trim());
        const r = await fetch(`/api/cards/lookup?${qs.toString()}`, { cache: 'no-store' });
        const data = (await r.json().catch(() => null)) as
          | { ok?: boolean; found?: boolean; card?: LookupCard | null }
          | null;
        if (data?.found && data.card) {
          list.push(lookupToRegister(data.card));
        }
      }

      // 2) snkrdunk 검색(1페이지) — 코드+번호로, 이름이 있으면 한→일 번역해서 검색.
      const queries: string[] = [];
      if (hasCode) queries.push(`${setCode.trim()} ${cardNumber.trim()}`.trim());
      if (hasName) {
        const ja = translate(name.trim(), 'ja');
        queries.push(ja || name.trim());
      }
      const seen = new Set<number>();
      const { items, anyRows } = await fetchSnkPage(queries, 1, seen);
      list.push(...items);
      pagingRef.current = { queries, seen, nextPage: 2 };
      setHasMore(anyRows);

      setResults(list);
      setSearched(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '검색 실패');
    } finally {
      setSearching(false);
    }
  };

  /** "더보기" — 다음 페이지를 이어서 로드해 append. 새 항목이 없으면 버튼 숨김. */
  const loadMore = async () => {
    if (loadingMore || searching) return;
    setLoadingMore(true);
    try {
      const { queries, seen, nextPage } = pagingRef.current;
      const { items, anyRows } = await fetchSnkPage(queries, nextPage, seen);
      pagingRef.current.nextPage = nextPage + 1;
      if (items.length > 0) setResults((prev) => [...prev, ...items]);
      // 서버 page 상한(50) 또는 빈 페이지/새 항목 없음 → 더보기 종료.
      setHasMore(anyRows && items.length > 0 && nextPage < 50);
    } finally {
      setLoadingMore(false);
    }
  };

  // 검색이 비어도 입력값 그대로 등록할 수 있도록 fallback 카드 구성
  const fallbackCard: RegisterCardInput = {
    setCode: setCode.trim() || null,
    cardNumber: cardNumber.trim() || null,
    name: name.trim() || null,
    imageUrl: null,
  };

  const selected = selectedIdx != null ? (results[selectedIdx] ?? null) : null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runSearch();
  };

  /* ── 등록 시트 단계 ── */
  if (registering) {
    return (
      <div style={{ background: P.pageBg, minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${P.line}` }}>
          <button
            type="button"
            onClick={() => setRegistering(null)}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', margin: -8, padding: 8, cursor: 'pointer' }}
            aria-label="다른 카드 선택"
          >
            <IcBack c={clean ? '#16161a' : 'var(--ink)'} />
          </button>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: P.ink, letterSpacing: -0.3 }}>카드 등록</div>
        </div>
        <div className="cv-manual-form">
          <CardRegisterSheet card={registering} />
        </div>
      </div>
    );
  }

  const labelSt: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 700,
    color: P.ink2,
    marginBottom: 5,
    paddingLeft: 2,
  };
  const inputSt: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    fontWeight: 700,
    color: P.ink,
    padding: 0,
    fontFamily: 'inherit',
  };

  return (
    <div style={{ background: P.pageBg, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── 헤더 + 입력 폼 (스크롤 시 상단 고정) ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: P.pageBg, borderBottom: `1px solid ${P.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px 8px' }}>
          <Link href="/my/cards" aria-label="뒤로가기" style={{ display: 'flex', alignItems: 'center', margin: -8, padding: 8 }}>
            <IcBack c={clean ? '#16161a' : 'var(--ink)'} />
          </Link>
          <div style={{ flex: 1, fontSize: 17, fontWeight: 800, color: P.ink, letterSpacing: -0.3 }}>카드 추가</div>
          <Link
            href="/cards/grading"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: P.btnBg,
              padding: '7px 12px',
              borderRadius: 20,
              textDecoration: 'none',
            }}
          >
            <IcScan c={clean ? '#fff' : 'var(--paper)'} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: P.btnFg, whiteSpace: 'nowrap' }}>스캔</span>
          </Link>
        </div>

        <div style={{ padding: '2px 16px 12px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={labelSt}>세트코드</div>
              <div style={{ display: 'flex', alignItems: 'center', background: P.fieldBg, border: `1.5px solid ${P.fieldBd}`, borderRadius: 11, padding: '10px 12px' }}>
                <input
                  style={inputSt}
                  maxLength={16}
                  value={setCode}
                  onChange={(e) => setSetCode(e.target.value.toUpperCase())}
                  onKeyDown={onKeyDown}
                  placeholder="예) SV4a"
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelSt}>카드번호</div>
              <div style={{ display: 'flex', alignItems: 'center', background: P.fieldBg, border: `1.5px solid ${P.fieldBd}`, borderRadius: 11, padding: '10px 12px' }}>
                <input
                  style={inputSt}
                  maxLength={16}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="예) 201/165"
                />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 9 }}>
            <div style={labelSt}>카드이름</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: P.nameBg, border: `1.5px solid ${P.accent}`, borderRadius: 11, padding: '11px 13px' }}>
              <IcSearch c={clean ? '#16161a' : 'var(--ink)'} />
              <input
                style={{ ...inputSt, fontSize: 14.5 }}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="예) 리자몽 ex"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName('')}
                  aria-label="이름 지우기"
                  style={{ display: 'flex', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={clean ? '#C7C7CC' : 'var(--ink3)'}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke={clean ? '#fff' : 'var(--paper)'} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {err && (
            <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: clean ? '#F5333F' : 'var(--red)' }}>⚠ {err}</div>
          )}
          <button
            type="button"
            disabled={searching}
            onClick={runSearch}
            style={{
              marginTop: 11,
              width: '100%',
              height: 44,
              borderRadius: 12,
              border: 'none',
              background: P.btnBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              cursor: 'pointer',
              opacity: searching ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            <IcSearch c={clean ? '#fff' : 'var(--paper)'} size={17} w={2.4} />
            <span style={{ fontSize: 14.5, fontWeight: 800, color: P.btnFg, whiteSpace: 'nowrap' }}>
              {searching ? '검색 중...' : '카드 검색'}
            </span>
          </button>
        </div>
      </div>

      {/* ── 검색 결과 영역 ── */}
      <div style={{ flex: 1 }}>
        {!searched && !searching && (
          <div style={{ textAlign: 'center', padding: '46px 24px', fontSize: 13, fontWeight: 600, color: P.ink3, lineHeight: 1.6 }}>
            세트코드+카드번호 또는 카드이름으로 검색해 보세요.
            <br />
            이름만 입력해도 검색돼요.
          </div>
        )}

        {searched && (
          <>
            {/* 필터 칩 */}
            <div
              style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 16px 12px', scrollbarWidth: 'none' }}
            >
              <Chip P={P}>
                <IcFilter c={P.ink} />
                필터
              </Chip>
              <Chip P={P} active>
                전체
              </Chip>
              <Chip P={P}>
                세트
                <IcCaret c={P.ink} size={12} />
              </Chip>
              <Chip P={P}>
                레어도
                <IcCaret c={P.ink} size={12} />
              </Chip>
              <Chip P={P}>일본판</Chip>
            </div>

            {/* 결과 수 + 정렬 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px 8px' }}>
              <div style={{ fontSize: 13.5, color: P.ink3, fontWeight: 600 }}>
                검색 결과 <span style={{ color: P.ink, fontWeight: 800 }}>{results.length}</span>개
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: P.ink }}>
                관련도순 <IcCaret c={P.ink} />
              </div>
            </div>

            {/* 결과 리스트 */}
            <div style={{ padding: '0 16px 10px' }}>
              {results.map((c, i) => {
                const sel = selectedIdx === i;
                const sub = [c.setCode?.toUpperCase(), c.cardNumber].filter(Boolean).join(' · ');
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedIdx(sel ? null : i)}
                    role="radio"
                    aria-checked={sel}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 13,
                      padding: 12,
                      borderRadius: 14,
                      marginBottom: 8,
                      cursor: 'pointer',
                      background: sel ? P.accentSoft : P.pageBg,
                      border: `1.5px solid ${sel ? P.accent : P.line}`,
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: 52,
                        height: 72,
                        borderRadius: 8,
                        background: P.fieldBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        flex: 'none',
                        overflow: 'hidden',
                        boxShadow: '0 3px 8px rgba(0,0,0,.14)',
                      }}
                    >
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt={c.name ?? '카드'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span>🃏</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name ?? '이름 미상'}
                      </div>
                      {sub && (
                        <div style={{ fontSize: 12, color: P.ink3, fontWeight: 600, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: P.ink2, border: `1px solid ${P.fieldBd}`, padding: '2px 7px', borderRadius: 6 }}>
                          일본판
                        </span>
                        {c.currentPriceJpy != null && (
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: P.ink, marginLeft: 2 }}>
                            ¥{Math.round(c.currentPriceJpy).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 'none',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${sel ? P.accent : P.radioBd}`,
                        background: P.pageBg,
                      }}
                    >
                      {sel && <div style={{ width: 12, height: 12, borderRadius: '50%', background: P.accent }} />}
                    </div>
                  </div>
                );
              })}

              {/* 더보기 — 다음 페이지 이어서 로드 */}
              {hasMore && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={loadMore}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    borderRadius: 12,
                    border: `1.5px solid ${P.fieldBd}`,
                    background: P.pageBg,
                    fontSize: 13,
                    fontWeight: 700,
                    color: P.ink,
                    cursor: 'pointer',
                    marginBottom: 4,
                    fontFamily: 'inherit',
                  }}
                >
                  {loadingMore ? '불러오는 중...' : '↓ 결과 더보기'}
                </button>
              )}

              {/* 검색에 안 잡혀도 입력한 정보로 직접 등록 */}
              <div style={{ textAlign: 'center', padding: '12px 0 8px', fontSize: 13, fontWeight: 700, color: P.ink3 }}>
                찾는 카드가 없나요?{' '}
                <span onClick={() => setRegistering(fallbackCard)} style={{ color: P.accent, cursor: 'pointer' }}>
                  직접 입력하기
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 하단 고정 추가 바 ── */}
      {searched && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 20,
            background: P.barBg,
            backdropFilter: 'blur(12px)',
            borderTop: `1px solid ${P.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px',
          }}
        >
          <div style={{ flex: 'none', maxWidth: 120 }}>
            <div style={{ fontSize: 11.5, color: P.ink3, fontWeight: 600 }}>선택한 카드</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: P.ink, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selected?.name ?? '선택 안 됨'}
            </div>
          </div>
          <button
            type="button"
            disabled={!selected}
            onClick={() => selected && setRegistering(selected)}
            style={{
              flex: 1,
              height: 50,
              borderRadius: 14,
              border: 'none',
              background: selected ? P.btnBg : P.disBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: selected ? 'pointer' : 'default',
              boxShadow: selected ? '0 6px 16px rgba(0,0,0,.18)' : 'none',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 15.5, fontWeight: 800, color: selected ? P.btnFg : P.disFg }}>
              {selected ? '내 컬렉션에 추가' : '카드를 선택하세요'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ P, active, children }: { P: Palette; active?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        whiteSpace: 'nowrap',
        fontSize: 13,
        fontWeight: 700,
        padding: '8px 14px',
        borderRadius: 11,
        background: active ? P.btnBg : P.pageBg,
        color: active ? P.btnFg : P.ink,
        border: `1px solid ${active ? P.btnBg : P.fieldBd}`,
      }}
    >
      {children}
    </div>
  );
}

function lookupToRegister(card: LookupCard): RegisterCardInput {
  return {
    cardId: null,
    setCode: card.setCode ?? null,
    cardNumber: card.number ?? null,
    name: card.localName || card.name || null,
    imageUrl: card.imageLarge || card.imageSmall || null,
    currentPriceJpy: card.priceSummary?.byRegion?.jpy ?? null,
    currentPriceKrw: card.priceSummary?.byRegion?.krw ?? null,
  };
}
