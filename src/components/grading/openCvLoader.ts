/**
 * OpenCV.js (~8MB) 지연 로더 — 다중 CDN 폴백 지원.
 *
 * 정책:
 *  - 1차: jsDelivr (@techstark/opencv-js) — 빠른 글로벌 CDN. 한국에서도 보통 1~3초.
 *  - 2차: docs.opencv.org 공식 — 1차 실패 시 자동 폴백.
 *  - 각 CDN 당 45초 타임아웃 → 둘 다 실패하면 90초 후 reject.
 *  - 같은 페이지에서 여러 번 호출돼도 script 태그는 한 번만 주입.
 *  - cv.onRuntimeInitialized 또는 이미 초기화된 cv.Mat 존재 여부로 준비 완료 판정.
 */

declare global {
  interface Window {
    cv?: unknown;
    Module?: { onRuntimeInitialized?: () => void } | undefined;
  }
}

const SCRIPT_ID = 'opencv-js-loader';
// 1차 jsDelivr — 한국·아시아에서 docs.opencv.org 보다 훨씬 빠름.
// 2차 docs.opencv.org — 공식 미러, 백업.
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js',
  'https://docs.opencv.org/4.10.0/opencv.js',
];
const READY_POLL_MS = 100;
const PER_URL_TIMEOUT_MS = 45_000;

let loadPromise: Promise<unknown> | null = null;

export interface OpenCvPhaseInfo {
  /** 1-indexed 시도 횟수 (1차/2차 …) */
  attempt?: number;
  /** 전체 시도 가능 횟수 (CDN 개수) */
  totalAttempts?: number;
  /** 현재 시도 중인 CDN 호스트 (예: 'cdn.jsdelivr.net') */
  host?: string;
}

interface LoadOpts {
  /** 진행상태 콜백. info 에 현재 시도 중인 CDN/시도횟수 포함. */
  onPhase?: (
    phase: 'inject' | 'script-loaded' | 'wasm-ready',
    info?: OpenCvPhaseInfo,
  ) => void;
  /** 한 CDN URL 당 타임아웃 ms. 기본 45_000. */
  timeoutMs?: number;
}

export function loadOpenCv(opts: LoadOpts = {}): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('opencv.js can only load in the browser'));
  }

  // 이미 ready
  if (isOpenCvReady()) return Promise.resolve((window as Window).cv);

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const errors: string[] = [];
    for (let i = 0; i < CDN_URLS.length; i++) {
      const url = CDN_URLS[i];
      const info: OpenCvPhaseInfo = {
        attempt: i + 1,
        totalAttempts: CDN_URLS.length,
        host: shortHost(url),
      };
      try {
        const cv = await loadFromUrl(url, opts, info);
        return cv;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${info.host}: ${msg}`);
        // 다음 CDN 시도 전에 실패한 script 태그 제거
        const existing = document.getElementById(SCRIPT_ID);
        if (existing) existing.remove();
        // 일부만 초기화된 cv 도 cleanup (다음 CDN 의 init 을 방해하지 않게)
        try {
          delete (window as { cv?: unknown }).cv;
        } catch {
          (window as { cv?: unknown }).cv = undefined;
        }
      }
    }
    loadPromise = null;
    throw new Error('OpenCV 로드 실패 — ' + errors.join(' / '));
  })();

  return loadPromise;
}

function loadFromUrl(url: string, opts: LoadOpts, info: OpenCvPhaseInfo): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeoutMs = opts.timeoutMs ?? PER_URL_TIMEOUT_MS;
    let settled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      clearTimeout(timeoutHandle);
    };

    const succeed = (cv: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      opts.onPhase?.('wasm-ready', info);
      resolve(cv);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const timeoutHandle = setTimeout(() => {
      fail(new Error('타임아웃'));
    }, timeoutMs);

    const w = window as Window;

    const tryReady = (): boolean => {
      const cv = w.cv as { Mat?: unknown } | undefined;
      if (cv && typeof cv.Mat === 'function') {
        succeed(cv);
        return true;
      }
      return false;
    };

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        if (settled) return;
        tryReady();
      }, READY_POLL_MS);
    };

    const attachReady = () => {
      if (tryReady()) return;
      const cvPartial = w.cv as { onRuntimeInitialized?: () => void } | undefined;
      if (cvPartial) {
        cvPartial.onRuntimeInitialized = () => {
          if (!tryReady()) startPolling();
        };
      }
      startPolling();
    };

    opts.onPhase?.('inject', info);
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = url;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onerror = () => fail(new Error('네트워크 또는 스크립트 오류'));
    s.onload = () => {
      opts.onPhase?.('script-loaded', info);
      attachReady();
    };
    document.head.appendChild(s);
  });
}

export function isOpenCvReady(): boolean {
  if (typeof window === 'undefined') return false;
  const cv = (window as Window).cv as { Mat?: unknown } | undefined;
  return !!(cv && typeof cv.Mat === 'function');
}

function shortHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
