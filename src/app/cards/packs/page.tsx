import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { PacksExplorer, type PackListRow } from '@/components/PacksExplorer';
import { CARD_PACKS } from '@/lib/cardPacks';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import { serverFetch } from '@/lib/apiServer';

interface ApparelGroupResp {
  apparels?: Array<{ localizedName: string; imageUrl: string | null; minPrice: number }>;
}

interface SearchResp {
  results?: Array<{ name: string; imageUrl: string | null; priceText: string }>;
}

export const metadata = {
  title: '시세확인 · CardVault',
  description: '포켓몬·원피스·유희왕·스포츠 카드 박스를 선택하고 박스별 싱글카드 시세를 확인하세요.',
};

export default async function PackExplorerPage() {
  const packs: PackListRow[] = await Promise.all(
    CARD_PACKS.map(async (pack) => {
      let box: { localizedName: string; imageUrl: string | null; minPrice: number } | null = null;
      if (pack.apparelGroupId) {
        const r = await serverFetch<{ data: ApparelGroupResp | null }>(
          `/api/snkrdunk/apparel-groups/${pack.apparelGroupId}?apparelCategoryId=14&page=1&perPage=1`,
          { auth: false },
        );
        box = r.data?.data?.apparels?.[0] ?? null;
      } else {
        // 그룹 미확인 팩(비포켓몬 일부) — 검색 1페이지의 첫 박스 매물로 대표 이미지/시세.
        const r = await serverFetch<SearchResp>(
          `/api/snkrdunk/search?q=${encodeURIComponent(`${pack.searchQuery} ボックス`)}`,
          { auth: false },
        );
        const hit = r.data?.results?.[0];
        if (hit) {
          box = {
            localizedName: hit.name,
            imageUrl: hit.imageUrl,
            minPrice: Number((hit.priceText ?? '').replace(/[^\d]/g, '')) || 0,
          };
        }
      }
      return {
        code: pack.code,
        game: pack.game ?? 'pokemon',
        name: pack.name,
        emoji: pack.emoji,
        bg: pack.bg,
        releasedAt: pack.releasedAt,
        boxName: box?.localizedName ?? pack.searchQuery,
        boxKoName: box?.localizedName ? translateKnownCardNameToKo(box.localizedName) : pack.name,
        boxImageUrl: box?.imageUrl ?? null,
        boxPrice: box?.minPrice ?? 0,
      };
    }),
  );

  return (
    <>
      <StatusBar />
      <AppBar title="시세확인" showBack backHref="/" />
      <PacksExplorer packs={packs} />
      <div className="bggap" />
    </>
  );
}
