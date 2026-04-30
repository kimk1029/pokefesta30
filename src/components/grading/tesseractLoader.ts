/**
 * Tesseract.js (~5MB) 지연 로더 + 필요 시 lang 데이터(kor ~13MB, eng ~10MB)도 첫 인식 시 자동 다운로드.
 * 페이지 마운트 즉시 부르지 말고, 사용자가 OCR 을 명시적으로 요청할 때만 호출.
 */

declare global {
  interface Window {
    Tesseract?: TesseractGlobal;
  }
}

interface TesseractGlobal {
  recognize: (
    image: HTMLImageElement | HTMLCanvasElement | string | Blob,
    langs?: string,
    options?: {
      logger?: (m: { status: string; progress?: number }) => void;
    },
  ) => Promise<{
    data: {
      text: string;
      lines: Array<{ text: string; confidence: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }>;
      words: Array<{ text: string; confidence: number }>;
    };
  }>;
}

const SCRIPT_ID = 'tesseract-js-loader';
const CDN_URL = 'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js';
const DEFAULT_TIMEOUT_MS = 60_000;

let loadPromise: Promise<TesseractGlobal> | null = null;

interface LoadOpts {
  onPhase?: (phase: 'inject' | 'script-loaded') => void;
  timeoutMs?: number;
}

export function loadTesseract(opts: LoadOpts = {}): Promise<TesseractGlobal> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('tesseract.js can only load in the browser'));
  }
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (loadPromise) return loadPromise;

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  loadPromise = new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      loadPromise = null;
      reject(new Error('Tesseract 로드 타임아웃 — 네트워크가 느리거나 차단되었을 수 있어요'));
    }, timeoutMs);

    const succeed = (T: TesseractGlobal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      opts.onPhase?.('script-loaded');
      resolve(T);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      loadPromise = null;
      reject(err);
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // 이미 주입됨 — 폴링
      const t = setInterval(() => {
        if (settled) {
          clearInterval(t);
          return;
        }
        if (window.Tesseract) {
          clearInterval(t);
          succeed(window.Tesseract);
        }
      }, 100);
      return;
    }

    opts.onPhase?.('inject');
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = CDN_URL;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onerror = () => fail(new Error('Tesseract 로드 실패 (네트워크 확인)'));
    s.onload = () => {
      if (window.Tesseract) {
        succeed(window.Tesseract);
      } else {
        // 매우 드물게 onload 후 글로벌이 늦게 정의되는 경우 폴링
        const t = setInterval(() => {
          if (window.Tesseract) {
            clearInterval(t);
            succeed(window.Tesseract);
          }
        }, 100);
      }
    };
    document.head.appendChild(s);
  });

  return loadPromise;
}

export function isTesseractReady(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.Tesseract;
}
