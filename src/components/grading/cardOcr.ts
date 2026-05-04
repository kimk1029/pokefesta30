/**
 * 카드 OCR — 사진 + 외곽 quad 가 주어지면 카드 영역만 잘라 Tesseract.js 로 텍스트 추출 후
 * 카드 번호 / 세트코드 / 일러스트레이터 등으로 파싱.
 *
 * 인식률을 높이는 전처리(중요):
 *   1. 큰 캔버스로 리사이즈 (max side 2400px) — 작은 텍스트 디테일 보존
 *   2. 하단 스트립을 그레이스케일 + 콘트라스트 스트레치 + 2x 업스케일 → Tesseract 가 좋아하는
 *      "검정 글자/흰 배경 + 큰 폰트" 형태로 변환
 *   3. PSM 11 (sparse text) + 영문/숫자/슬래시/하이픈/점 화이트리스트 — 카드 좌하단 코드 +
 *      우하단 카드번호 같은 "흩어진 작은 텍스트" 인식에 최적
 */

import { loadTesseract } from './tesseractLoader';

export type Pt = { x: number; y: number };
export type Quad = [Pt, Pt, Pt, Pt];

export interface OcrLine {
  text: string;
  confidence: number;
}

export interface CardOcrResult {
  /** 전체 OCR 텍스트 (raw). */
  rawText: string;
  /** Tesseract 가 분리한 줄 단위 (신뢰도 포함). */
  lines: OcrLine[];
  /** "045/198" 같은 번호 매칭 — 가장 확률 높은 것 첫 번째. */
  cardNumber: { left: string; right: string; raw: string } | null;
  /** SV-P, S-P, XY-P 등 프로모 코드. */
  promoCode: string | null;
  /** "SV1", "SV5K", "SM12a" 같은 세트 코드 (좌하단 또는 카드번호 옆). */
  setCode: string | null;
  /** "Illus. ..." 일러스트레이터 표기. */
  illustrator: string | null;
}

interface OcrProgress {
  phase: 'load-script' | 'load-lang' | 'recognize';
  /** 0..1 (가능한 경우). */
  progress?: number;
  label?: string;
}

interface RunOpts {
  onProgress?: (p: OcrProgress) => void;
  /** 'eng' (기본) 또는 'kor+eng' — 한국어 lang 데이터(13MB) 추가 다운로드. */
  langs?: string;
  /**
   * 카드 어느 부분만 OCR 할지.
   *  'bottom' (기본) — 하단 15% (좌하단 세트코드 + 우하단 카드번호 영역)
   *  'full'         — 전체
   */
  region?: 'bottom' | 'full';
}

/**
 * 외곽 quad 의 bounding box 로 이미지를 잘라 캔버스에 그린 후 OCR 실행.
 * 기본: 하단 15% 만 잘라 영문 OCR — 카드번호/세트코드 인식에 최적화. (작아서 빠르고, 오인식 줄어듦)
 * outerQuad 가 null 이면 이미지 전체에서 같은 비율 영역.
 */
export async function recognizeCard(
  img: HTMLImageElement,
  outerQuad: Quad | null,
  opts: RunOpts = {},
): Promise<CardOcrResult> {
  const langs = opts.langs ?? 'eng';
  const region = opts.region ?? 'bottom';

  opts.onProgress?.({ phase: 'load-script', label: '스크립트 다운로드' });
  const T = await loadTesseract();

  // 카드 영역 크롭 + 리사이즈 — 디테일 보존을 위해 큰 캔버스(2400)
  const fullCanvas = cropToBboxAndResize(img, outerQuad, 2400);

  // 하단 모드면: 하단 12% 스트립 → 전처리(그레이/콘트라스트/2x 업스케일) 적용
  // 전체 모드면: 그대로 사용 (전처리 안 함 — 카드 일러스트 색상 정보가 OCR 외 용도로 필요할 수도)
  const stripRaw = region === 'bottom' ? cropBottomStrip(fullCanvas, 0.12) : fullCanvas;
  const canvas = region === 'bottom' ? preprocessForOcr(stripRaw) : stripRaw;

  opts.onProgress?.({ phase: 'recognize', progress: 0, label: '텍스트 인식 준비…' });

  const ret = await T.recognize(canvas, langs, {
    // Pokemon 카드 하단처럼 짧은 텍스트가 좌/우/여러 줄에 흩어져 있는 경우엔 PSM 11(sparse)이
    // 기본값(PSM 3, auto)보다 훨씬 잘 잡아냄. 전체 이미지(region='full') 일 때도 sparse 가 안전.
    tessedit_pageseg_mode: 11,
    // 카드에 등장 가능한 글자만 — 영문 대소문자 + 숫자 + 슬래시/하이픈/점/공백 + 콜론
    tessedit_char_whitelist:
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-.: ',
    logger: (m) => {
      // m.status: 'loading tesseract core' | 'initializing tesseract' | 'loading language traineddata' |
      //           'initializing api' | 'recognizing text' 등
      if (m.status?.includes('language')) {
        opts.onProgress?.({ phase: 'load-lang', progress: m.progress, label: '언어 데이터 다운로드' });
      } else if (m.status?.includes('recognizing')) {
        opts.onProgress?.({ phase: 'recognize', progress: m.progress, label: '텍스트 인식 중' });
      } else if (m.status) {
        opts.onProgress?.({ phase: 'recognize', progress: m.progress, label: m.status });
      }
    },
  });

  const text = ret.data.text || '';
  const lines: OcrLine[] = (ret.data.lines || []).map((l) => ({
    text: l.text.trim(),
    confidence: l.confidence,
  }));

  return parseCardText(text, lines);
}

/* ---------------------------- crop ----------------------------- */

function cropToBboxAndResize(
  img: HTMLImageElement,
  q: Quad | null,
  maxSide: number,
): HTMLCanvasElement {
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;

  let x = 0;
  let y = 0;
  let w = w0;
  let h = h0;
  if (q) {
    const xs = q.map((p) => p.x);
    const ys = q.map((p) => p.y);
    const pad = 8;
    x = Math.max(0, Math.min(...xs) - pad);
    y = Math.max(0, Math.min(...ys) - pad);
    w = Math.min(w0 - x, Math.max(...xs) - x + pad);
    h = Math.min(h0 - y, Math.max(...ys) - y + pad);
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
  return canvas;
}

/** 캔버스 하단 ratio(0..1) 영역만 새 캔버스로 잘라냄. 카드 번호/세트코드 영역 추출용. */
function cropBottomStrip(src: HTMLCanvasElement, ratio: number): HTMLCanvasElement {
  const stripH = Math.max(40, Math.round(src.height * ratio));
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = stripH;
  const ctx = out.getContext('2d');
  if (!ctx) return src;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, src.height - stripH, src.width, stripH, 0, 0, src.width, stripH);
  return out;
}

/**
 * Tesseract 가 잘 읽도록 캔버스 전처리:
 *   1. 그레이스케일
 *   2. 콘트라스트 스트레치 — 1, 99 percentile 을 0/255 로 매핑 (히스토그램 균등화 비슷한 효과)
 *   3. 2x 업스케일(nearest neighbor) — 작은 글자를 ~30px+ 로 키워서 인식률 ↑
 *
 * 리턴 캔버스는 흑백 단색 (R=G=B), Tesseract LSTM 모델이 좋아하는 입력 형태.
 */
function preprocessForOcr(src: HTMLCanvasElement): HTMLCanvasElement {
  const sw = src.width;
  const sh = src.height;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  if (!sctx) return src;
  const sd = sctx.getImageData(0, 0, sw, sh).data;

  // 1) 그레이스케일 + 명도 히스토그램
  const gray = new Uint8Array(sw * sh);
  const hist = new Uint32Array(256);
  for (let i = 0; i < sw * sh; i++) {
    const r = sd[i * 4];
    const g = sd[i * 4 + 1];
    const b = sd[i * 4 + 2];
    const v = ((r * 299 + g * 587 + b * 114) / 1000) | 0;
    gray[i] = v;
    hist[v]++;
  }

  // 2) 1, 99 percentile 찾기 (극단값에 영향 안 받게)
  const total = sw * sh;
  let lo = 0;
  let hi = 255;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc > total * 0.01) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc > total * 0.01) {
      hi = v;
      break;
    }
  }
  // 콘트라스트가 너무 낮으면 스트레치 안 하기 (전부 까맣게/하얗게 되는 거 방지)
  if (hi - lo < 30) {
    lo = 0;
    hi = 255;
  }
  const range = hi - lo;

  // 3) 2x 업스케일 + 콘트라스트 스트레치 (한 패스)
  const SCALE = 2;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  const out = document.createElement('canvas');
  out.width = dw;
  out.height = dh;
  const octx = out.getContext('2d');
  if (!octx) return src;
  const od = octx.createImageData(dw, dh);
  const dout = od.data;

  for (let y = 0; y < dh; y++) {
    const srcY = (y / SCALE) | 0;
    for (let x = 0; x < dw; x++) {
      const srcX = (x / SCALE) | 0;
      const v0 = gray[srcY * sw + srcX];
      let v = ((v0 - lo) / range) * 255;
      if (v < 0) v = 0;
      else if (v > 255) v = 255;
      const di = (y * dw + x) * 4;
      const vi = v | 0;
      dout[di] = vi;
      dout[di + 1] = vi;
      dout[di + 2] = vi;
      dout[di + 3] = 255;
    }
  }
  octx.putImageData(od, 0, 0);
  return out;
}

/* ---------------------------- parse ---------------------------- */

const CARD_NUM_RE = /(\d{1,3})\s*[\\/／]\s*(\d{1,3})/g;
const PROMO_NUM_RE = /(\d{1,3})\s*[\\/／]\s*(SV-?P|S-?P|XY-?P|BW-?P|HGSS-?P|DP-?P|SM-?P)/gi;
// 세트 코드: 영문 대문자 1~4 + 선택적 숫자/대문자 1~3, 단어 경계.
// 예: SV1, SV5K, SM12a, XY12, BW11, HGSS, RC0123 (HGSS는 대문자 4)
const SET_CODE_RE = /\b(SV[A-Z0-9]{0,3}|SM[A-Z0-9]{0,3}|XY[A-Z0-9]{0,3}|BW[A-Z0-9]{0,3}|HGSS[A-Z0-9]{0,3}|DP[A-Z0-9]{0,3}|RC\d{1,3})\b/g;
const ILLUS_RE = /Illus(?:trator)?\.?\s+([A-Za-z][A-Za-z\.\s'-]{1,30})/i;

function parseCardText(text: string, lines: OcrLine[]): CardOcrResult {
  // 1) Card number — 프로모(SV-P 등) 우선 매칭, 그 다음 일반 N/M 형식.
  const promoMatches = Array.from(text.matchAll(PROMO_NUM_RE));
  const numMatches = Array.from(text.matchAll(CARD_NUM_RE));

  let cardNumber: CardOcrResult['cardNumber'] = null;
  let promoCode: string | null = null;

  if (promoMatches.length > 0) {
    const m = promoMatches[0];
    cardNumber = { left: m[1], right: m[2].toUpperCase(), raw: m[0] };
    promoCode = m[2].toUpperCase();
  } else if (numMatches.length > 0) {
    // 분모(우측)가 큰 매치 선호 — 실제 세트 카드 번호의 분모(전체 카드 수)가 보통 두자리 이상
    const best = numMatches
      .map((m) => ({ m, denom: Number(m[2]) }))
      .filter((x) => x.denom >= 1)
      .sort((a, b) => b.denom - a.denom)[0];
    if (best) {
      cardNumber = { left: best.m[1], right: best.m[2], raw: best.m[0] };
    }
  }

  // 2) Set code — 카드 번호와 분리된 세트 식별자.
  // 카드 번호 부분과 겹치지 않게 cardNumber.raw 가 포함된 영역은 제외.
  let setCode: string | null = null;
  const setMatches = Array.from(text.matchAll(SET_CODE_RE)).map((m) => m[0].toUpperCase());
  if (setMatches.length > 0) {
    // 가장 흔한(빈도 높은) 코드 우선
    const counts = new Map<string, number>();
    for (const c of setMatches) counts.set(c, (counts.get(c) ?? 0) + 1);
    const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    setCode = ranked[0][0];
  }

  // 3) Illustrator
  let illustrator: string | null = null;
  const im = text.match(ILLUS_RE);
  if (im) illustrator = im[1].trim().replace(/\s+/g, ' ');

  return {
    rawText: text,
    lines,
    cardNumber,
    promoCode,
    setCode,
    illustrator,
  };
}
