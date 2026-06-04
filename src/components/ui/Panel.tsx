'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { isFlatTheme } from '@/lib/theme';

/**
 * 앱 전역 공통 박스 컴포넌트.
 *
 * 모든 패널/카드 박스는 인라인 box-shadow 를 직접 쓰지 말고 이 컴포넌트를 통해 그린다.
 * 테마에 따라 테두리/그림자/라운드를 한 곳에서 결정한다:
 *   - clean  : 흰 면 + 옅은 보더 + 라운드(--r) + 소프트 섀도우 (핵심지표·바로가기·카드검색 인풋과 동일)
 *   - 그 외  : 픽셀 하드 잉크 프레임
 *
 * 배경색/보더-탑 액센트 등은 `style` 로 넘기면 테마 스타일 위에 머지된다.
 * (단, border/borderRadius/boxShadow 는 Panel 이 소유하므로 caller 가 넘기지 말 것.)
 */

/** clean 테마 공통 박스 면 스타일 — 다른 컴포넌트에서도 재사용. */
export const CLEAN_PANEL: CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--pap3)',
  borderRadius: 'var(--r)',
  boxShadow: '0 1px 2px rgba(24,34,58,.04),0 10px 24px rgba(24,34,58,.06)',
};

/** 픽셀 테마 표준 박스 그림자. */
export const PIXEL_PANEL_SHADOW =
  '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),inset 0 -3px 0 rgba(0,0,0,.12),5px 5px 0 var(--ink)';

interface PanelProps {
  children?: ReactNode;
  /** 배경색·보더탑 액센트·패딩 등 추가 스타일. (border/radius/shadow 제외) */
  style?: CSSProperties;
  /** 픽셀 테마 전용 box-shadow 오버라이드 (포트폴리오 히어로 등 특수 박스). */
  pixelShadow?: string;
  /** Link 로 만들 때 */
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export function Panel({
  children,
  style,
  pixelShadow,
  href,
  target,
  rel,
  onClick,
  className,
  ariaLabel,
}: PanelProps) {
  const { theme } = useTheme();
  // clean·dark = 플랫(논픽셀) → 모던 라운드 박스. 그 외 = 픽셀 프레임.
  const isClean = isFlatTheme(theme);

  const themeStyle: CSSProperties = isClean
    ? CLEAN_PANEL
    : { background: 'var(--white)', boxShadow: pixelShadow ?? PIXEL_PANEL_SHADOW };

  const merged: CSSProperties = { ...themeStyle, ...style };

  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        aria-label={ariaLabel}
        onClick={onClick}
        style={{ textDecoration: 'none', color: 'inherit', display: 'block', ...merged }}
      >
        {children}
      </Link>
    );
  }
  return (
    <div className={className} aria-label={ariaLabel} onClick={onClick} style={merged}>
      {children}
    </div>
  );
}
