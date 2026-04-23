import { PixelBulbasaur } from './PixelBulbasaur';
import { PixelCharmander } from './PixelCharmander';
import { PixelDitto } from './PixelDitto';
import { PixelEevee } from './PixelEevee';
import { PixelLapras } from './PixelLapras';
import { PixelMewtwo } from './PixelMewtwo';
import { PixelMoltres } from './PixelMoltres';
import { PixelPikachu } from './PixelPikachu';
import { PixelSnorlax } from './PixelSnorlax';
import { PixelSquirtle } from './PixelSquirtle';
import { isAvatarId, type AvatarId } from '@/lib/avatars';

interface Props {
  id?: AvatarId | string | null;
  size?: number;
  fallback?: string;
}

/**
 * id 가 유효한 아바타이면 픽셀 컴포넌트를, 아니면 이모지 폴백을 렌더.
 */
export function PokemonAvatar({ id, size = 30, fallback = '🐣' }: Props) {
  if (!isAvatarId(id ?? '')) {
    return (
      <span style={{ fontSize: Math.floor(size * 0.75), lineHeight: 1 }}>
        {id && id.length <= 4 ? id : fallback}
      </span>
    );
  }
  switch (id as AvatarId) {
    case 'bulbasaur':  return <PixelBulbasaur size={size} />;
    case 'charmander': return <PixelCharmander size={size} />;
    case 'squirtle':   return <PixelSquirtle size={size} />;
    case 'pikachu':    return <PixelPikachu size={size} />;
    case 'eevee':      return <PixelEevee size={size} />;
    case 'snorlax':    return <PixelSnorlax size={size} />;
    case 'ditto':      return <PixelDitto size={size} />;
    case 'lapras':     return <PixelLapras size={size} />;
    case 'mewtwo':     return <PixelMewtwo size={size} />;
    case 'moltres':    return <PixelMoltres size={size} />;
  }
}
