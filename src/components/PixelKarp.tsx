import Image from 'next/image';

/**
 * 잉어킹 (Magikarp · 국가도감 #129) — PokéAPI Gen 5 BW 스프라이트.
 * 기존 컴포넌트 이름을 유지하여 호출부 (HeroSlider 등) 무수정.
 * 애니메이션 GIF 라 unoptimized — Next 옵티마이저가 정지 프레임으로 만드는 걸 방지.
 */
export function PixelKarp({ size = 130 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        lineHeight: 0,
      }}
    >
      <Image
        src="/sprites/129.gif"
        alt="잉어킹"
        width={size}
        height={size}
        unoptimized
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          imageRendering: 'pixelated',
          display: 'block',
        }}
      />
    </span>
  );
}
