'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PixelKarp } from './PixelKarp';

interface Slide {
  cls: 'slide-a' | 'slide-b' | 'slide-c';
  badge: string;
  title: string;
  sub: string;
  visual: ReactNode;
}

const SLIDES: Slide[] = [
  {
    cls: 'slide-a',
    badge: '★ 포케페스타30 공식',
    title: '잉어킹\n프로모!',
    sub: '지금 어디가 덜 붐비는지\n실시간으로 확인하세요',
    visual: <PixelKarp size={82} />,
  },
  {
    cls: 'slide-b',
    badge: '⚡ 실시간 거래 활성',
    title: '삽니다\n팝니다',
    sub: '성수 현장 직거래\n장소 태그로 빠르게 연결',
    visual: <div style={{ fontSize: 48, lineHeight: 1 }}>💬</div>,
  },
  {
    cls: 'slide-c',
    badge: '📢 30초 제보',
    title: '지금\n제보하기',
    sub: '방금 본 현장 상황을\n다른 트레이너에게 알려주세요',
    visual: <div style={{ fontSize: 48, lineHeight: 1 }}>📢</div>,
  },
];

const AUTOPLAY_MS = 3500;

export function HeroSlider() {
  const [cur, setCur] = useState(0);
  const startX = useRef(0);
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

  return (
    <div
      className="hero-wrap"
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
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
          <div key={i} className={`hero-slide ${sl.cls}`}>
            <span className="hero-badge">{sl.badge}</span>
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
              <div className="hero-vis-lbl">[ 메가페스타 공식 비주얼 ]</div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="harrow l"
        aria-label="이전 슬라이드"
        onClick={() => {
          go(cur - 1);
          reset();
        }}
      >
        ◀
      </button>
      <button
        type="button"
        className="harrow r"
        aria-label="다음 슬라이드"
        onClick={() => {
          go(cur + 1);
          reset();
        }}
      >
        ▶
      </button>
      <div className="hero-dots">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`hdot ${i === cur ? 'on' : ''}`}
            onClick={() => {
              go(i);
              reset();
            }}
          />
        ))}
      </div>
    </div>
  );
}
