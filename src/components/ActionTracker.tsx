'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 전 사용자(회원/비회원) 행동 추적기 — 모든 클릭 + 페이지이동을 /api/metrics/action 에 배치 전송.
 * - 비회원은 localStorage 익명 id(anonId)로 식별, 회원은 서버가 토큰으로 userId 첨부.
 * - sendBeacon 으로 non-blocking 전송, 4초 주기 + 페이지 숨김/이탈 시 flush.
 * - UX 영향 0 을 위해 모든 실패는 조용히 무시.
 */
const ENDPOINT = '/api/metrics/action';
const ANON_KEY = 'pf30_anon';
const FLUSH_MS = 4000;
const MAX_QUEUE = 20;

interface Ev {
  type: string;
  path: string;
  target?: string;
  referer?: string;
}

let queue: Ev[] = [];
let anonId = '';

function getAnonId(): string {
  if (anonId) return anonId;
  try {
    let v = localStorage.getItem(ANON_KEY);
    if (!v) {
      v = crypto.randomUUID ? crypto.randomUUID() : `a_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ANON_KEY, v);
    }
    anonId = v;
  } catch {
    anonId = 'anon';
  }
  return anonId;
}

function flush(): void {
  if (queue.length === 0) return;
  const events = queue;
  queue = [];
  const payload = JSON.stringify({ source: 'web', anonId: getAnonId(), events });
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* noop */
  }
}

function enqueue(ev: Ev): void {
  queue.push(ev);
  if (queue.length >= MAX_QUEUE) flush();
}

/** 클릭 대상을 간결한 한 줄로 — data-track 우선, 없으면 가장 가까운 의미요소의 태그:라벨. */
function describeTarget(target: EventTarget | null): string {
  const start = target instanceof Element ? target : null;
  if (!start) return '';
  const node =
    start.closest('a,button,[role="button"],[data-track],input,select,textarea,label') ?? start;
  const el = node as HTMLElement;
  const dt = el.getAttribute?.('data-track');
  if (dt) return dt.slice(0, 100);
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  const href = el.getAttribute?.('href') ?? '';
  const aria = el.getAttribute?.('aria-label') ?? '';
  const cls = typeof el.className === 'string' ? el.className.split(/\s+/)[0] : '';
  const label = (text || aria || href || el.id || cls || '').slice(0, 60);
  return [tag, label].filter(Boolean).join(':').slice(0, 120);
}

export function ActionTracker() {
  const pathname = usePathname();

  // 페이지이동 1건
  useEffect(() => {
    if (!pathname) return;
    enqueue({
      type: 'pageview',
      path: pathname,
      referer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    });
  }, [pathname]);

  // 전역 클릭 캡처 + flush 타이밍 (마운트 1회)
  useEffect(() => {
    getAnonId();
    const onClick = (e: MouseEvent) => {
      const path = `${location.pathname}${location.search}`;
      enqueue({ type: 'click', path, target: describeTarget(e.target) });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    const timer = window.setInterval(flush, FLUSH_MS);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      window.clearInterval(timer);
      flush();
    };
  }, []);

  return null;
}
