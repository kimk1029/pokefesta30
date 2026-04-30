/**
 * 카드 OCR — 사진 + 외곽 quad 가 주어지면 카드 영역만 잘라 Tesseract.js 로 텍스트 추출 후
 * 카드 번호 / HP / 이름 후보 등으로 파싱.
 *
 * Perspective 보정은 하지 않음 — 사용자가 정면 촬영을 안내받음. bbox 크롭만 수행해도
 * 약간의 사다리꼴은 Tesseract 가 처리.
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

  // 카드 영역 크롭 + 리사이즈
  const fullCanvas = cropToBboxAndResize(img, outerQuad, 1500);
  const canvas = region === 'bottom' ? cropBottomStrip(fullCanvas, 0.15) : fullCanvas;

  opts.onProgress?.({ phase: 'recognize', progress: 0, label: '텍스트 인식 준비…' });

  const ret = await T.recognize(canvas, langs, {
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
