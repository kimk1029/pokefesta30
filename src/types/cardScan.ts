export type ScanCandidateSource =
  | 'tcgdex'
  | 'tcgdex-exact'
  | 'tcgdex-search'
  | 'pokemon_tcg_api'
  | 'internal'
  | 'unknown';

export interface ScanPrice {
  marketPrice?: number | null;
  currency?: string;
  source?: string;
  updatedAt?: string;
}

export interface PriceByRegion {
  eur: number | null;
  usd: number | null;
  jpy: number | null;
  krw: number | null;
}

export interface PriceSummary {
  source: string;
  value: number;
  currency: 'EUR' | 'USD' | 'KRW';
  low: number | null;
  trend: number | null;
  byRegion?: PriceByRegion;
}

export interface ScanCandidate {
  id: string;
  source: ScanCandidateSource;
  /** Display name — Korean (localName) when known, else native name. */
  name: string;
  /** Korean override from local DB when present. */
  localName?: string | null;
  /** Japanese katakana name (for search / display in parens). */
  nameJa?: string;
  setName?: string;
  setCode?: string;
  number?: string;
  rarity?: string;
  language?: string;
  /** TCGdex image URLs — `imageLarge` is the high-res png used by the
   *  result card slot; `imageSmall` is the webp used for thumbnails. Either
   *  can be null when the API has no art for the card. */
  imageSmall?: string | null;
  imageLarge?: string | null;
  /** Legacy single-currency hint, kept for backward-compat. */
  imageUrl?: string;
  price?: ScanPrice;
  /** Multi-region pricing from TCGdex (cardmarket EUR, FX-derived JPY/KRW). */
  priceSummary?: PriceSummary | null;
}

export interface ScanExtracted {
  rawText?: string;
  cardNumber?: string;
  totalNumber?: string;
  setCode?: string;
  rarity?: string;
  language?: 'ko' | 'jp' | 'en' | 'unknown';
  name?: string;
}

export interface CardScanResponse {
  success: boolean;
  scanId?: string;
  confidence?: number;
  /** True when the server actually used the AI/Vision path for this scan. */
  usedAi?: boolean;
  extracted?: ScanExtracted;
  candidates: ScanCandidate[];
  needsUserSelection: boolean;
  message?: string;
}

export interface GuideRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ScanLanguage = 'ko' | 'jp' | 'en';

export interface ScanUploadInput {
  uri: string;
  imageWidth: number;
  imageHeight: number;
  guideRect: GuideRect;
  capturedAt: string;
  /** Opt in to GPT Vision extraction on the server. Default false (Tesseract only). */
  useAi?: boolean;
  /** User-picked card language. Routes server name OCR to that worker only. */
  language?: ScanLanguage;
}
