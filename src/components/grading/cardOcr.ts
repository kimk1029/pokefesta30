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
  /** "HP120" 식 hp. */
  hp: number | null;
  /** 이름 후보들 — 가장 큰 글자 (위쪽 라인 우선) 기준 상위 3개. */
  nameCandidates: string[];
  /** 한국 프로모 코드 등 (SV-P, S-P, XY-P, BW-P). */
  promoCode: string | null;
}

interface OcrProgress {
  phase: 'load-script' | 'load-lang' | 'recognize';
  /** 0..1 (가능한 경우). */
  progress?: number;
  label?: string;
}

interface RunOpts {
  onProgress?: (p: OcrProgress) => void;
  /** 'kor+eng' 또는 'eng' 만 — 한국어 lang 데이터(13MB) 다운로드 회피용. */
  langs?: string;
}

/**
 * 외곽 quad 의 bounding box 로 이미지를 잘라 캔버스에 그린 후 OCR 실행.
 * outerQuad 가 null 이면 이미지 전체를 OCR.
 */
export async function recognizeCard(
  img: HTMLImageElement,
  outerQuad: Quad | null,
  opts: RunOpts = {},
): Promise<CardOcrResult> {
  const langs = opts.langs ?? 'kor+eng';

  opts.onProgress?.({ phase: 'load-script', label: '스크립트 다운로드' });
  const T = await loadTesseract();

  // 카드 영역 크롭 + 리사이즈
  const canvas = cropToBboxAndResize(img, outerQuad, 1500);

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

/* ---------------------------- parse ---------------------------- */

const CARD_NUM_RE = /(\d{1,3})\s*[\\/／]\s*(\d{1,3})/g;
const PROMO_NUM_RE = /(\d{1,3})\s*[\\/／]\s*(SV-?P|S-?P|XY-?P|BW-?P|HGSS-?P|DP-?P)/gi;
const HP_RE = /\bHP\s*(\d{2,3})\b/i;

function parseCardText(text: string, lines: OcrLine[]): CardOcrResult {
  // 1) Card number
  const promoMatches = Array.from(text.matchAll(PROMO_NUM_RE));
  const numMatches = Array.from(text.matchAll(CARD_NUM_RE));

  let cardNumber: CardOcrResult['cardNumber'] = null;
  let promoCode: string | null = null;

  if (promoMatches.length > 0) {
    const m = promoMatches[0];
    cardNumber = { left: m[1], right: m[2].toUpperCase(), raw: m[0] };
    promoCode = m[2].toUpperCase();
  } else if (numMatches.length > 0) {
    // 가장 그럴듯한 매치: 분모(우측)가 큰 것 선호 (실제 세트 카드 번호가 보통 분모 큼)
    const best = numMatches
      .map((m) => ({ m, denom: Number(m[2]) }))
      .filter((x) => x.denom >= 1)
      .sort((a, b) => b.denom - a.denom)[0];
    if (best) {
      cardNumber = { left: best.m[1], right: best.m[2], raw: best.m[0] };
    }
  }

  // 2) HP
  let hp: number | null = null;
  const hpMatch = text.match(HP_RE);
  if (hpMatch) {
    const v = Number(hpMatch[1]);
    if (v >= 30 && v <= 350) hp = v;
  }

  // 3) Name candidates — 위쪽 라인 우선, 한글/영문 한 글자 이상 + 숫자 비율 낮은 라인
  const nameCandidates = lines
    .filter((l) => {
      const t = l.text.trim();
      if (t.length < 2 || t.length > 30) return false;
      // 숫자만 또는 거의 숫자인 라인 제외
      const digitRatio = (t.replace(/\D/g, '').length) / t.length;
      if (digitRatio > 0.5) return false;
      // HP / illus / no. 등 메타 키워드 제외
      if (/^(HP|illus|no\.|©|™)/i.test(t)) return false;
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map((l) => l.text.trim());

  return {
    rawText: text,
    lines,
    cardNumber,
    hp,
    nameCandidates,
    promoCode,
  };
}
