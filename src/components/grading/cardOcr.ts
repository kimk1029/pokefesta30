/**
 * 카드 OCR — 사진 + 외곽 quad 가 주어지면 카드 영역만 잘라 Express 서버
 * (/api/cards/scan) 로 업로드. 서버에서 GPT-4o-mini Vision (또는 PaddleOCR 폴백)
 * 으로 카드 정보(이름/세트/번호/희귀도/언어)를 추출하고, 로컬 DB + TCGdex +
 * Snkrdunk 매칭까지 묶어 후보 리스트를 돌려준다. 모바일 앱과 동일한 백엔드.
 *
 * 흐름:
 *   1. outerQuad bbox 로 캔버스 크롭(+ 8px 패딩) → 긴 변 2400px 로 리사이즈
 *   2. JPEG Blob 인코딩
 *   3. POST FormData( image, guideRect, platform=web, language, useAi )
 *   4. 응답을 기존 CardOcrResult 형태로 매핑 (+ 후보 리스트는 별도 필드로 노출)
 */

export type Pt = { x: number; y: number };
export type Quad = [Pt, Pt, Pt, Pt];

/** 모바일 ScanCandidate 와 동일한 구조 — 웹/모바일 공통 백엔드 응답. */
export interface ScanCandidate {
  id: string;
  source: string;
  name: string;
  localName?: string | null;
  nameJa?: string;
  setName?: string;
  setCode?: string;
  number?: string;
  rarity?: string;
  language?: string;
  imageSmall?: string | null;
  imageLarge?: string | null;
  imageUrl?: string;
  price?: {
    marketPrice?: number | null;
    currency?: string;
    source?: string;
    updatedAt?: string;
  };
  priceSummary?: {
    source: string;
    value: number;
    currency: 'EUR' | 'USD' | 'KRW' | 'JPY';
    low: number | null;
    trend: number | null;
    byRegion?: {
      eur: number | null;
      usd: number | null;
      jpy: number | null;
      krw: number | null;
    };
  } | null;
  snkrdunk?: {
    apparelId: number;
    imageUrl: string | null;
    priceJpy: number | null;
    priceText: string;
    localizedName?: string;
    listingCountText?: string;
    cacheHit?: boolean;
  } | null;
}

export interface OcrLine {
  text: string;
  confidence: number;
}

export interface CardOcrResult {
  /** 전체 OCR 텍스트 (raw) — 서버가 만든 요약 라인. */
  rawText: string;
  /** 호환용 — 서버 응답에는 줄 단위 분해 데이터가 없어서 빈 배열. */
  lines: OcrLine[];
  /** "045/198" 같은 번호 매칭. left = cardNumber, right = totalNumber. */
  cardNumber: { left: string; right: string; raw: string } | null;
  /** SV-P, S-P, XY-P 등 프로모 코드 (서버가 setCode 로 normalize 함). */
  promoCode: string | null;
  /** "SV1", "SV5K", "SM12a" 같은 세트 코드. */
  setCode: string | null;
  /** 호환용 — 서버 응답에는 일러스트레이터 필드 없음. */
  illustrator: string | null;

  /* --- 서버 Vision 추가 필드 (모바일과 동일) -------------------- */
  /** 카드 이름 (한국어/영어/일어 중 OCR 가 잡은 것). */
  name: string | null;
  /** 일본어 이름 — TCGdex 검색 시 사용. */
  nameJa: string | null;
  /** 총 카드 수 ("198" 등). cardNumber.right 와 같지만 단독 노출. */
  totalNumber: string | null;
  /** 희귀도 (R / RR / SR / SAR / AR / U / C 등). */
  rarity: string | null;
  /** 카드 언어 ko/jp/en. */
  language: 'ko' | 'jp' | 'en' | 'unknown' | null;
  /** Vision 경로가 실제로 사용됐는지. */
  usedAi: boolean;
  /** 서버 매칭 신뢰도 (0..1). 미제공 시 null. */
  confidence: number | null;
  /** 서버 후보 리스트 (이미지 + 다지역 가격 + Snkrdunk 매칭). */
  candidates: ScanCandidate[];
  /**
   * AI(Vision) 가 추정한 카드 외곽 4코너 — image 자연 좌표 기준 (CardGrader 가
   * normalized 0..1 → 자연 픽셀로 변환해 setOuter). 추정 불가능하면 null.
   */
  outerQuad: Quad | null;
  /** AI 가 추정한 카드 인쇄 프레임 안쪽 4코너. 같은 좌표계, 없으면 null. */
  innerQuad: Quad | null;
}

interface OcrProgress {
  phase: 'crop' | 'upload' | 'processing' | 'done';
  /** 0..1 (가능한 경우). */
  progress?: number;
  label?: string;
}

interface RunOpts {
  onProgress?: (p: OcrProgress) => void;
  /** 'ko' (기본) | 'jp' | 'en' — 서버 OCR 언어 힌트. */
  language?: 'ko' | 'jp' | 'en';
  /**
   * GPT Vision 사용 여부 힌트. 서버는 visionAvailable() 일 때 자동 사용하지만
   * 모바일과 폼 모양을 맞추기 위해 그대로 전송.
   */
  useAi?: boolean;
}

const SCAN_ENDPOINT = '/api/cards/scan';
const UPLOAD_TIMEOUT_MS = 180_000;
const CROP_MAX_SIDE = 2400;
const CROP_PADDING = 8;

/**
 * outerQuad 의 bbox(+ 패딩) 로 이미지 크롭 후 서버 OCR 호출.
 * outerQuad 가 null 이면 이미지 전체를 그대로 업로드.
 */
export async function recognizeCard(
  img: HTMLImageElement,
  outerQuad: Quad | null,
  opts: RunOpts = {},
): Promise<CardOcrResult> {
  const language = opts.language ?? 'ko';
  const useAi = opts.useAi ?? true;

  opts.onProgress?.({ phase: 'crop', progress: 0.05, label: '카드 영역 자르는 중…' });
  const { canvas, bbox } = cropToBboxAndResize(img, outerQuad, CROP_MAX_SIDE);
  const blob = await canvasToJpegBlob(canvas, 0.92);

  opts.onProgress?.({ phase: 'upload', progress: 0.2, label: '서버로 업로드 중…' });

  const form = new FormData();
  form.append('image', blob, `scan-${Date.now()}.jpg`);
  form.append(
    'guideRect',
    JSON.stringify({ x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h }),
  );
  form.append('platform', 'web');
  form.append('imageWidth', String(img.naturalWidth));
  form.append('imageHeight', String(img.naturalHeight));
  form.append('capturedAt', new Date().toISOString());
  form.append('language', language);
  if (useAi) form.append('useAi', 'true');

  opts.onProgress?.({ phase: 'processing', progress: 0.4, label: 'AI 카드 정보 인식 중…' });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(SCAN_ENDPOINT, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`네트워크 오류: ${msg}`);
  }
  clearTimeout(timeoutId);

  let data: ServerScanResponse;
  try {
    data = (await res.json()) as ServerScanResponse;
  } catch {
    throw new Error('서버 응답 형식이 올바르지 않습니다.');
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `서버 오류 (${res.status})`);
  }

  opts.onProgress?.({ phase: 'done', progress: 1, label: '완료' });
  // AI 가 돌려준 quad 는 _업로드된 크롭 이미지_ 기준 0..1. 원본 이미지 자연
  // 좌표계로 매핑하려면 bbox 의 (x,y) 오프셋 + (w,h) 스케일 곱하면 된다.
  return mapResponseToOcrResult(data, bbox);
}

/* --------------------------- crop + encode --------------------- */

interface CropResult {
  canvas: HTMLCanvasElement;
  /** 자연 이미지 좌표 기준 bbox (서버에 guideRect 로 전달). */
  bbox: { x: number; y: number; w: number; h: number };
}

function cropToBboxAndResize(
  img: HTMLImageElement,
  q: Quad | null,
  maxSide: number,
): CropResult {
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;

  let x = 0;
  let y = 0;
  let w = w0;
  let h = h0;
  if (q) {
    const xs = q.map((p) => p.x);
    const ys = q.map((p) => p.y);
    x = Math.max(0, Math.min(...xs) - CROP_PADDING);
    y = Math.max(0, Math.min(...ys) - CROP_PADDING);
    w = Math.min(w0 - x, Math.max(...xs) - x + CROP_PADDING);
    h = Math.min(h0 - y, Math.max(...ys) - y + CROP_PADDING);
  }

  const longSide = Math.max(w, h);
  const scale = longSide > maxSide ? maxSide / longSide : 1;
  const dstW = Math.round(w * scale);
  const dstH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2D context 사용 불가');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, h, 0, 0, dstW, dstH);
  return { canvas, bbox: { x, y, w, h } };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('이미지 인코딩 실패'));
      },
      'image/jpeg',
      quality,
    );
  });
}

/* --------------------------- response map ---------------------- */

interface ServerExtracted {
  rawText?: string;
  name?: string;
  nameJa?: string;
  cardNumber?: string;
  totalNumber?: string;
  setCode?: string;
  rarity?: string;
  language?: 'ko' | 'jp' | 'en' | 'unknown';
  /** 정규화된 0..1 비율 좌표의 4 코너 (TL,TR,BR,BL). 없으면 null. */
  outerQuad?: Array<{ x: number; y: number }> | null;
  innerQuad?: Array<{ x: number; y: number }> | null;
}

interface ServerScanResponse {
  success: boolean;
  message?: string;
  confidence?: number;
  usedAi?: boolean;
  extracted?: ServerExtracted;
  candidates?: ScanCandidate[];
  needsUserSelection?: boolean;
}

function mapResponseToOcrResult(
  data: ServerScanResponse,
  bbox: { x: number; y: number; w: number; h: number },
): CardOcrResult {
  const ex = data.extracted ?? {};
  const cardNumberLeft = (ex.cardNumber ?? '').trim();
  const cardNumberRight = (ex.totalNumber ?? '').trim();

  let cardNumber: CardOcrResult['cardNumber'] = null;
  if (cardNumberLeft) {
    cardNumber = {
      left: cardNumberLeft,
      right: cardNumberRight,
      raw: cardNumberRight ? `${cardNumberLeft}/${cardNumberRight}` : cardNumberLeft,
    };
  }

  // 서버는 promo 를 setCode 로 normalize (e.g. "SV-P"). 그래서 promoCode 는
  // setCode 가 "-P" 로 끝날 때만 분리해서 노출 — 기존 UI 가 promoCode 필드를
  // 그대로 표시하기 때문에 유지.
  const setCodeRaw = (ex.setCode ?? '').trim();
  const isPromo = /-P$/i.test(setCodeRaw);
  const setCode = setCodeRaw || null;
  const promoCode = isPromo ? setCodeRaw.toUpperCase() : null;

  return {
    rawText: ex.rawText ?? '',
    lines: [],
    cardNumber,
    promoCode,
    setCode,
    illustrator: null,
    name: ex.name?.trim() || null,
    nameJa: ex.nameJa?.trim() || null,
    totalNumber: cardNumberRight || null,
    rarity: ex.rarity?.trim() || null,
    language: ex.language ?? null,
    usedAi: !!data.usedAi,
    confidence: typeof data.confidence === 'number' ? data.confidence : null,
    candidates: Array.isArray(data.candidates) ? data.candidates : [],
    outerQuad: mapQuadToNatural(ex.outerQuad, bbox),
    innerQuad: mapQuadToNatural(ex.innerQuad, bbox),
  };
}

/**
 * 서버가 돌려준 normalized 0..1 quad(크롭 이미지 기준) → 원본 이미지 자연 좌표.
 * bbox 가 원본 이미지에서 잘려나간 영역의 (x,y,w,h) 이므로
 *   natX = bbox.x + normX * bbox.w,  natY = bbox.y + normY * bbox.h
 */
function mapQuadToNatural(
  quad: Array<{ x: number; y: number }> | null | undefined,
  bbox: { x: number; y: number; w: number; h: number },
): Quad | null {
  if (!Array.isArray(quad) || quad.length !== 4) return null;
  const out = quad.map((p) => ({
    x: bbox.x + p.x * bbox.w,
    y: bbox.y + p.y * bbox.h,
  }));
  return out as Quad;
}
