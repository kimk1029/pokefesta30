'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PixelKarp } from './PixelKarp';
import { StampRallyModal } from './StampRallyModal';

interface Slide {
  cls: 'slide-a' | 'slide-b' | 'slide-c' | 'slide-d';
  badge: string;
  title: string;
  sub: string;
  visual: ReactNode;
  onClick?: 'stamp-rally' | 'oripa' | null;
  ctaHint?: string;
}

const SLIDES: Slide[] = [
  {
    cls: 'slide-a',
    badge: '★ 팬 프로젝트',
    title: '잉어킹\n프로모!',
    sub: '성수 6곳 스탬프 랠리\n탭해서 이벤트 상세 보기',
    visual: <PixelKarp size={82} />,
    onClick: 'stamp-rally',
    ctaHint: '👉 TAP',
  },
  {
    cls: 'slide-b',
    badge: '⚡ 실시간 거래 활성',
    title: '삽니다\n팝니다',
    sub: '성수 현장 직거래\n장소 태그로 빠르게 연결',
    visual: <div style={{ fontSize: 69, lineHeight: 1 }}>💬</div>,
    onClick: null,
  },
  {
    cls: 'slide-c',
    badge: '📢 30초 제보',
    title: '지금\n제보하기',
    sub: '방금 본 현장 상황을\n다른 트레이너에게 알려주세요',
    visual: <div style={{ fontSize: 69, lineHeight: 1 }}>📢</div>,
    onClick: null,
  },
  {
    cls: 'slide-d',
    badge: '🎴 오리파 뽑기',
    title: '한정 카드\n뽑기!',
    sub: 'S급 카드를 뽑을 기회\n탭해서 지금 도전',
    visual: <div style={{ fontSize: 69, lineHeight: 1 }}>🎴</div>,
    onClick: 'oripa',
    ctaHint: '👉 TAP',
  },
];

const AUTOPLAY_MS = 3500;

export function HeroSlider() {
  const router = useRouter();
  const { status } = useSession();
  const [cur, setCur] = useState(0);
  const [showRally, setShowRally] = useState(false);
  const startX = useRef(0);
  const dragged = useRef(false);
  const tmr = useRef<ReturnType<typeof setInterval> | null>(null);
  const n = SLIDES.length;

  const go = useCallback((i: number) => setCur((i + n) % n), [n]);

  const reset = useCallback(() => {
    if (tmr.current) clearInterval(tmr.current);
    tmr.current = setInterval(() => setCur((c) => (c + 1) % n), AUTOPLAY_MS);
  }, [n]);

  useEffect(() => {
    tmr.current = setInterval(() => setCur((c) => (c + 1) % n), AUTOPLAY_MS);
    return () => {
      if (tmr.current) clearInterval(tmr.current);
    };
  }, [n]);

  const handleSlideClick = (slide: Slide) => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    if (slide.onClick === 'stamp-rally') {
      setShowRally(true);
      if (tmr.current) clearInterval(tmr.current);
      return;
    }
    if (slide.onClick === 'oripa') {
      if (status === 'authenticated') {
        router.push('/my/oripa');
      } else {
        const ok = window.confirm(
          '오리파 뽑기는 로그인이 필요합니다.\n로그인하러 가시겠어요?',
        );
        if (ok) router.push('/login?callbackUrl=/my/oripa');
      }
    }
  };

  return (
    <>
      <div
        className="hero-wrap"
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
          dragged.current = false;
        }}
        onTouchMove={(e) => {
          const dx = Math.abs(e.touches[0].clientX - startX.current);
          if (dx > 8) dragged.current = true;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - startX.current;
          if (dx < -30) {
            go(cur + 1);
            reset();
          } else if (dx > 30) {
            go(cur - 1);
            reset();
          }
        }}
      >
        <div className="hero-track" style={{ transform: `translateX(${-cur * 100}%)` }}>
          {SLIDES.map((sl, i) => (
            <div
              key={i}
              className={`hero-slide ${sl.cls}${sl.onClick ? ' clickable' : ''}`}
              onClick={() => handleSlideClick(sl)}
              role={sl.onClick ? 'button' : undefined}
              tabIndex={sl.onClick ? 0 : undefined}
            >
              <span className="hero-badge">{sl.badge}</span>
              {sl.ctaHint && <span className="hero-cta-hint">{sl.ctaHint}</span>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <h1>
                    {sl.title.split('\n').map((line, j) => (
                      <span key={j}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </h1>
                  <p>
                    {sl.sub.split('\n').map((line, j) => (
                      <span key={j}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </p>
                </div>
                {sl.visual}
              </div>
              <div className="hero-vis">
                <div className="hero-vis-lbl">[ 비공식 팬아트 비주얼 ]</div>
              </div>
            </div>
          ))}
        </div>
        <div className="hero-dots">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`hdot ${i === cur ? 'on' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                go(i);
                reset();
              }}
            />
          ))}
        </div>
      </div>

      {showRally && <StampRallyModal onClose={() => setShowRally(false)} />}
    </>
  );
}
