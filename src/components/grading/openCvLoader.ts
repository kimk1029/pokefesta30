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

let loadPromise: Promise<unknown> | null = null;

/** opencv.js 로드 후 cv 객체 resolve. 실패 시 reject. */
export function loadOpenCv(): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('opencv.js can only load in the browser'));
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // 이미 cv 가 들어와있고 Mat 사용 가능하면 즉시 resolve
    const w = window as Window;
    if (w.cv && typeof (w.cv as { Mat?: unknown }).Mat === 'function') {
      resolve(w.cv);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // 다른 호출이 이미 주입했지만 아직 초기화 중 — onload 후 cv.onRuntimeInitialized 기다림
      attachReadyListener(resolve);
      return;
    }

    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = CDN_URL;
    s.async = true;
    s.onerror = () => {
      loadPromise = null;
      reject(new Error('opencv.js 로드 실패 (네트워크 확인)'));
    };
    s.onload = () => attachReadyListener(resolve);
    document.head.appendChild(s);
  });

  return loadPromise;
}

function attachReadyListener(resolve: (cv: unknown) => void) {
  const w = window as Window;
  // cv 객체는 곧장 정의되지만 WASM 초기화는 비동기 — onRuntimeInitialized 이후에 Mat 사용 가능
  const tryReady = () => {
    const cv = (w.cv as { Mat?: unknown; onRuntimeInitialized?: () => void } | undefined);
    if (cv && typeof cv.Mat === 'function') {
      resolve(cv);
      return true;
    }
    return false;
  };
  if (tryReady()) return;

  const cvPartial = w.cv as { onRuntimeInitialized?: () => void } | undefined;
  if (cvPartial) {
    cvPartial.onRuntimeInitialized = () => {
      if (!tryReady()) {
        // 정말 드물지만 — 폴링 백업
        const t = setInterval(() => {
          if (tryReady()) clearInterval(t);
        }, 100);
      }
    };
    return;
  }

  // cv 가 아직 글로벌에 없음 — 폴링
  const timer = setInterval(() => {
    if (tryReady()) clearInterval(timer);
  }, 100);
}
