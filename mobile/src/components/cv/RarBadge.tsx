import { rarityBg, rarityFg, type Rarity } from '@/data/cardvault';
import { PixelTag } from './PixelTag';

interface Props {
  rar: Rarity;
  size?: number;
  px?: number;
  py?: number;
}

export function RarBadge({ rar, size = 9, px = 7, py = 3 }: Props) {
  return (
    <PixelTag bg={rarityBg[rar]} fg={rarityFg[rar]} size={size} px={px} py={py}>
      {rar}
    </PixelTag>
  );
}
