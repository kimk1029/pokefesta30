/**
 * OpenCV.js (~8MB) 지연 로더.
 * - 같은 페이지에서 여러 번 호출돼도 script 태그는 한 번만 주입.
 * - cv.onRuntimeInitialized 또는 이미 초기화된 cv.Mat 존재 여부로 준비 완료 판정.
 */

declare global {
  interface Window {
    cv?: unknown;
    Module?: { onRuntimeInitialized?: () => void } | undefined;
  }
}

const SCRIPT_ID = 'opencv-js-loader';
const CDN_URL = 'https://docs.opencv.org/4.10.0/opencv.js';
const READY_POLL_MS = 100;
const DEFAULT_TIMEOUT_MS = 60_000; // 60초 — 모바일 데이터에서도 충분

let loadPromise: Promise<unknown> | null = null;

interface LoadOpts {
  /** 진행상태 콜백 (분석/디버깅 용). */
  onPhase?: (phase: 'inject' | 'script-loaded' | 'wasm-ready') => void;
  /** 타임아웃 ms. 기본 60_000. */
  timeoutMs?: number;
}

/**
 * opencv.js 를 한 번만 로드하고 cv 객체 resolve. 실패/타임아웃 시 reject.
 * 페이지 마운트 즉시 부르지 말고, 사용자가 자동 검출을 명시적으로 요청할 때만 호출 권장.
 */
export function loadOpenCv(opts: LoadOpts = {}): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('opencv.js can only load in the browser'));
  }

  // 이미 ready
  const w = window as Window;
  if (w.cv && typeof (w.cv as { Mat?: unknown }).Mat === 'function') {
    return Promise.resolve(w.cv);
  }

  if (loadPromise) return loadPromise;

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  loadPromise = new Promise((resolve, reject) => {
    let settled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      clearTimeout(timeoutHandle);
    };

    const timeoutHandle = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      loadPromise = null;
      reject(new Error('OpenCV 로드 타임아웃 — 네트워크가 느리거나 차단되었을 수 있어요'));
    }, timeoutMs);

    const succeed = (cv: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      opts.onPhase?.('wasm-ready');
      resolve(cv);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      loadPromise = null;
      reject(err);
    };

    const tryReady = (): boolean => {
      const cv = (w.cv as { Mat?: unknown } | undefined);
      if (cv && typeof cv.Mat === 'function') {
        succeed(cv);
        return true;
      }
      return false;
    };

    // 폴링 — onRuntimeInitialized 미스 가능성 보호
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
      // cv 가 아직 정의 안 됐거나 콜백 미스 시를 위해 폴링도 같이 시작
      startPolling();
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      attachReady();
      return;
    }

    opts.onPhase?.('inject');

    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = CDN_URL;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onerror = () => fail(new Error('OpenCV 로드 실패 (네트워크 확인)'));
    s.onload = () => {
      opts.onPhase?.('script-loaded');
      attachReady();
    };
    document.head.appendChild(s);
  });

  return loadPromise;
}

/** 이미 로드되었는지 동기적으로 확인 — UI 에서 disabled 상태 결정용. */
export function isOpenCvReady(): boolean {
  if (typeof window === 'undefined') return false;
  const cv = (window as Window).cv as { Mat?: unknown } | undefined;
  return !!(cv && typeof cv.Mat === 'function');
}
