import { isAvatarId, type AvatarId } from '@/lib/avatars';

/** 국가도감 번호 매핑 — /public/sprites/{id}.gif 로 해석됨. */
const POKEMON_NO: Record<AvatarId, number> = {
  bulbasaur: 1,
  charmander: 4,
  squirtle: 7,
  butterfree: 12,
  pidgeotto: 17,
  rattata: 19,
  pikachu: 25,
  diglett: 50,
  voltorb: 100,
  'mr-mime': 122,
  jynx: 124,
  gyarados: 130,
  lapras: 131,
  ditto: 132,
  eevee: 133,
  porygon: 137,
  snorlax: 143,
  articuno: 144,
  zapdos: 145,
  moltres: 146,
  mewtwo: 150,
  mew: 151,
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
