'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useCurrency } from '@/components/CurrencyProvider';
import { CardThumb } from '@/components/CardThumb';
import { PriceChip } from '@/components/PriceChip';
import { autoPriceSize } from '../../shared/util/autoPriceSize';

interface Props {
  href: string;
  image: string | null;
  title: string;
  /** 일본어 원문 등 보조 타이틀 — 있으면 타이틀 아래 한 줄(ellipsis). */
  subtitle?: string | null;
  priceJpy: number;
  /** true(기본)면 가격 라벨 길이에 따라 fontSize 단계 축소. false 면 11 고정. */
  fitPrice?: boolean;
  /** 플랫(clean 계열) 테마 — 본문 구분선/가격 칩을 라운드 계열로. */
  flat?: boolean;
  /** 가격 아래 상태 한 줄(최근 거래·매물 수). undefined 면 미표시. */
  footer?: string;
  titleSize?: number;
  /** 타이틀 아래 여백 — 기본은 subtitle 유무에 따라 3/6. */
  titleGap?: number;
  /** 본문 padding. */
  bodyPadding?: string;
  /** 루트(Link/div) 추가 스타일 — 상단 액센트 보더 등. */
  style?: CSSProperties;
  /** 카드 하단 부가 액션(제거 버튼 등) — 있으면 루트가 div 가 되고 본문만 Link. */
  actions?: ReactNode;
}

/**
 * "pack-grid-card" 세로 카드 타일 — 63/88 비율 썸네일 + 2줄 clamp 타이틀 +
 * 가격 칩. 팩 시세/검색 결과/관심카드 3열 그리드에서 공용.
 */
export function PackGridCard({
  href,
  image,
  title,
  subtitle,
  priceJpy,
  fitPrice = true,
  flat = false,
  footer,
  titleSize = 11,
  titleGap,
  bodyPadding = '7px 8px 9px',
  style,
  actions,
}: Props) {
  const { format } = useCurrency();
  const hasPrice = priceJpy > 0;
  const priceStr = hasPrice ? format(priceJpy) : '시세 없음';
  // 자릿수 기반 단계적 축소 — 다른 가격 박스(컬렉션·검색·스포트라이트)와 동일한
  // 헬퍼. 박스(그리드 1/3 폭) 안에 줄임표 없이 다 표시되도록 min 7.
  const priceFont = fitPrice ? autoPriceSize(priceStr, 11, 7) : 11;

  const body = (
    <>
      <CardThumb
        src={image}
        alt={title}
        style={{ aspectRatio: '63 / 88', background: 'var(--pap2)', overflow: 'hidden' }}
      />
      <div style={{ padding: bodyPadding, borderTop: flat ? '1px solid var(--pap3)' : '3px solid var(--ink)' }}>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: titleSize,
            letterSpacing: 0.2,
            marginBottom: titleGap ?? (subtitle ? 3 : 6),
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 30,
            lineHeight: 1.45,
            wordBreak: 'keep-all',
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--ink3)',
              marginBottom: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
        ) : null}
        <PriceChip label={priceStr} hasPrice={hasPrice} fontSize={priceFont} flat={flat} />
        {footer !== undefined ? (
          <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginTop: 5, letterSpacing: 0.3, minHeight: 12 }}>
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );

  // 액션(제거 버튼 등)이 있으면 Link 안에 button 을 넣을 수 없으므로
  // 루트를 div 로 두고 썸네일+본문만 Link 로 감싼다.
  if (actions) {
    return (
      <div className="pack-grid-card" style={style}>
        <Link href={href} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          {body}
        </Link>
        {actions}
      </div>
    );
  }
  return (
    <Link href={href} className="pack-grid-card" style={style}>
      {body}
    </Link>
  );
}
