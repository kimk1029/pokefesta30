'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useCurrency } from '@/components/CurrencyProvider';
import { useUnread } from '@/components/UnreadProvider';
import { HeroSlider, type HeroSlideData } from '@/components/HeroSlider';
import type { SnkrdunkRow } from '@/components/dashboard/DashboardScreen';

/**
 * 클린 스타일 메인화면 — Claude Design 'POKE30 App' 프로토타입 정밀 복제.
 *  헤더(POKE30+벨) · 검색 · 프로모 배너 · 빠른 스캔 · HOT 카드 · 박스 힛카드 · 실시간 급등.
 * 프로토타입 고유 팔레트(오렌지 #FF7A00 액센트)를 그대로 사용한다 — 클린 테마 전용 홈.
 * 카드 아트는 프로토타입의 그라데이션 플레이스홀더 대신 실제 snkrdunk 이미지를 채운다.
 */

// 프로토타입 팔레트
const C = {
  ink: '#16161a',
  ink2: '#8E8E93',
  ink3: '#9A9AA0',
  accent: '#FF7A00',
  green: '#5FB85A',
  rise: '#F5333F',
  searchBg: '#F2F2F4',
  tileBg: '#F7F7F9',
  line: '#F0F0F2',
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
  if (rank === 1) return C.rise;
  if (rank === 3) return C.accent;
  return '#2B2B2B';
}

interface Props {
  heroBanners?: HeroSlideData[];
  isLoggedIn: boolean;
  snkrdunkRows?: SnkrdunkRow[];
  snkrdunkBoxRows?: SnkrdunkRow[];
}

const hrowStyle: CSSProperties = {
  display: 'flex',
  gap: 14,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  padding: '4px 20px 8px',
};

function SectionHead({ title, href }: { title: ReactNode; href: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px 13px',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>{title}</div>
      <Link
        href={href}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          fontSize: 13,
          fontWeight: 600,
          color: C.ink3,
          textDecoration: 'none',
        }}
      >
        더보기
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

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
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: radius,
        overflow: 'hidden',
        background: imageUrl ? '#fff' : FALLBACK_GRADS[fallbackIdx % FALLBACK_GRADS.length],
        boxShadow: '0 6px 14px rgba(0,0,0,.16)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 40 }}>🃏</span>
      )}
      {children}
    </div>
  );
}

export function CleanHome({ heroBanners, snkrdunkRows = [], snkrdunkBoxRows = [] }: Props) {
  const { format } = useCurrency();
  const { count: unread } = useUnread();

  const fmtPrice = (jpy: number) => (jpy > 0 ? format(jpy) : '—');

  return (
    <div style={{ fontFamily: 'var(--f1)', background: '#fff', minHeight: '100%' }}>
      {/* header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px 8px',
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.5px' }}>
          <span style={{ color: C.ink }}>POKE</span>
          <span style={{ color: C.accent }}>30</span>
        </div>
        <Link href="/my/messages" aria-label="알림" style={{ position: 'relative', display: 'block', color: C.ink }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: 1,
                width: 8,
                height: 8,
                background: C.rise,
                borderRadius: '50%',
                border: '1.5px solid #fff',
              }}
            />
          )}
        </Link>
      </div>

      {/* search */}
      <div style={{ padding: '6px 20px 14px' }}>
        <Link
          href="/cards/snkrdunk/search"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: C.searchBg,
            borderRadius: 14,
            padding: '13px 16px',
            textDecoration: 'none',
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span style={{ flex: 1, fontSize: 14.5, color: C.ink3 }}>카드명 또는 세트명으로 검색하세요</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
          </svg>
        </Link>
      </div>

      {/* promo banner — 실제 배너 데이터(HeroSlider). 비면 컴포넌트 내장 폴백 슬라이드. */}
      <HeroSlider slides={heroBanners} compact />

      {/* quick scan */}
      <div style={{ padding: '8px 20px 24px' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 12 }}>빠른 스캔</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <QuickTile
            href="/cards/packs"
            label="시세 확인"
            desc="카드 시세를 바로 확인해요"
            icon={
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3.2" />
              </svg>
            }
          />
          <QuickTile
            href="/cards/add"
            label="내 카드 등록"
            desc="보유 카드를 등록하고 관리해요"
            icon={
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M12 11v6M9 14h6" />
              </svg>
            }
          />
        </div>
      </div>

      {/* HOT cards */}
      {snkrdunkRows.length > 0 && (
        <div style={{ padding: '0 0 24px' }}>
          <SectionHead title="HOT 카드" href="/cards/snkrdunk" />
          <div style={hrowStyle}>
            {snkrdunkRows.map((c, i) => (
              <Link
                key={c.apparelId}
                href={`/cards/snkrdunk/${c.apparelId}`}
                style={{ flex: 'none', width: 100, textDecoration: 'none', color: 'inherit' }}
              >
                <CardArt imageUrl={c.imageUrl} fallbackIdx={i} width={100} height={138} radius={11}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: rankBadgeColor(i + 1),
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 5px rgba(0,0,0,.25)',
                    }}
                  >
                    {i + 1}
                  </div>
                </CardArt>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: C.ink,
                    marginTop: 9,
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.shortName}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginTop: 3 }}>{fmtPrice(c.minPrice)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* box hot cards */}
      {snkrdunkBoxRows.length > 0 && (
        <div style={{ padding: '0 0 26px' }}>
          <SectionHead title="박스 힛카드" href="/cards/packs" />
          <div style={hrowStyle}>
            {snkrdunkBoxRows.map((b, i) => (
              <Link
                key={b.apparelId}
                href={`/cards/snkrdunk/${b.apparelId}`}
                style={{ flex: 'none', width: 100, textDecoration: 'none', color: 'inherit' }}
              >
                <CardArt imageUrl={b.imageUrl} fallbackIdx={i} width={100} height={100} radius={13} />
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: C.ink,
                    marginTop: 9,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {b.shortName}
                </div>
                <div style={{ fontSize: 11, color: C.ink2, marginTop: 3 }}>
                  평균 시세 <span style={{ color: C.rise, fontWeight: 800 }}>{fmtPrice(b.minPrice)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* realtime movers */}
      {snkrdunkRows.length > 0 && (
        <div style={{ padding: '0 20px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 18, fontWeight: 800, color: C.ink }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.rise} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 17 6-6 4 4 8-8" />
                <path d="M17 7h4v4" />
              </svg>
              실시간 급등 카드
            </div>
            <Link
              href="/cards/snkrdunk"
              style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: C.ink3, textDecoration: 'none' }}
            >
              더보기
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          </div>
          {snkrdunkRows.map((m, i) => {
            const sub = m.localizedName && m.localizedName !== m.shortName ? m.localizedName : m.category ?? '카드';
            return (
              <Link
                key={m.apparelId}
                href={`/cards/snkrdunk/${m.apparelId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 0',
                  borderBottom: `1px solid ${C.line}`,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, width: 14, textAlign: 'center' }}>{i + 1}</div>
                <CardArt imageUrl={m.imageUrl} fallbackIdx={i} width={46} height={46} radius={9} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.ink,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {m.shortName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.ink3,
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {sub}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{fmtPrice(m.minPrice)}</div>
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
  href,
  label,
  desc,
  icon,
}: {
  href: string;
  label: string;
  desc: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{ background: C.tileBg, borderRadius: 16, padding: '16px 14px', textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {icon}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2C2C8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginTop: 14 }}>{label}</div>
      <div style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>{desc}</div>
    </Link>
  );
}
