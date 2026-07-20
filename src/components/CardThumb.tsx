import type { CSSProperties, ReactNode } from 'react';

interface Props {
  src: string | null | undefined;
  alt: string;
  /** 이미지 없을 때 표시할 폴백 이모지. */
  emoji?: string;
  emojiSize?: number;
  /** 폴백 이모지 추가 스타일 (drop-shadow 등). */
  emojiStyle?: CSSProperties;
  className?: string;
  /** 래퍼 박스 스타일 — 크기·배경·보더·둥근 모서리는 호출부가 지정. */
  style?: CSSProperties;
  /** img 태그 추가 스타일. */
  imgStyle?: CSSProperties;
  loading?: 'lazy' | 'eager';
  /** 랭크 배지 등 오버레이 — 이미지/폴백 뒤에 렌더 (absolute 포지셔닝은 호출부 몫). */
  children?: ReactNode;
}

/**
 * 카드 썸네일 — 이미지가 있으면 cover 로 꽉 채우고, 없으면 이모지 폴백을
 * 가운데 표시. 외부 도메인(SNKRDUNK/TCGdex 등) 이미지라 next/image 도메인
 * 화이트리스트 대신 일반 <img> 사용.
 */
export function CardThumb({
  src,
  alt,
  emoji = '🃏',
  emojiSize = 37,
  emojiStyle,
  className,
  style,
  imgStyle,
  loading,
  children,
}: Props) {
  return (
    <div className={className} style={style}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={loading}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...imgStyle }}
        />
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
          <span style={{ fontSize: emojiSize, ...emojiStyle }}>{emoji}</span>
        </div>
      )}
      {children}
    </div>
  );
}
