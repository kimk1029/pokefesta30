/**
 * 일러스트레이터 카드 검색 — 웹 /cards/search?mode=illustrator 와 동일한
 * 서버 API(/api/cards/by-illustrator). 한글 별칭→EN/JA 사전 매칭 후 카드 목록 반환.
 */
import { api } from '@/lib/apiClient';

export interface IllustratorCard {
  id: string;
  name: string;
  setName?: string;
  setCode?: string;
  number?: string;
  totalNumber?: string | number;
  rarity?: string;
  illustrator?: string;
  imageSmall?: string | null;
  imageLarge?: string | null;
}

export interface IllustratorSearchResp {
  ok: boolean;
  resolvedName?: string;
  matched?: { en: string; ja: string | null; koAliases: string[] } | null;
  count?: number;
  cards?: IllustratorCard[];
  message?: string;
}

export async function searchByIllustrator(q: string, limit = 30): Promise<IllustratorSearchResp> {
  return api<IllustratorSearchResp>(
    `/api/cards/by-illustrator?q=${encodeURIComponent(q)}&limit=${limit}`,
    { auth: false },
  );
}
