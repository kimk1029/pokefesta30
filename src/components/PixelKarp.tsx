/**
 * 잉어킹 (Magikarp · 국가도감 #129) — PokéAPI Gen 5 BW 스프라이트.
 * 기존 컴포넌트 이름을 유지하여 호출부 (HeroSlider 등) 무수정.
 */
export function PixelKarp({ size = 80 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/sprites/129.png"
      width={size}
      height={size}
      alt="잉어킹"
      style={{
        imageRendering: 'pixelated',
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );
}
