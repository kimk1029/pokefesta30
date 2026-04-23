import { isAvatarId, type AvatarId } from '@/lib/avatars';

/** 국가도감 번호 매핑 — /public/sprites/{id}.png 로 해석됨. */
const POKEMON_NO: Record<AvatarId, number> = {
  bulbasaur: 1,
  charmander: 4,
  squirtle: 7,
  pikachu: 25,
  eevee: 133,
  ditto: 132,
  snorlax: 143,
  lapras: 131,
  mewtwo: 150,
  moltres: 146,
};

interface Props {
  id?: AvatarId | string | null;
  size?: number;
  fallback?: string;
}

export function PokemonAvatar({ id, size = 60, fallback = '🐣' }: Props) {
  if (!isAvatarId(id ?? '')) {
    return (
      <span style={{ fontSize: Math.floor(size * 0.7), lineHeight: 1 }}>
        {id && id.length <= 4 ? id : fallback}
      </span>
    );
  }
  const no = POKEMON_NO[id as AvatarId];
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/sprites/${no}.gif`}
        alt={String(id)}
        loading="lazy"
        decoding="async"
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
