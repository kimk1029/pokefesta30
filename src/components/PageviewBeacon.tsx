'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 경로 변경 시마다 /api/metrics/pageview 에 비콘 전송.
 * navigator.sendBeacon → 페이지 언로드 중에도 보존, non-blocking.
 * admin 루트/에서는 당연히 호출 안 함 (이 컴포넌트는 메인 앱 layout 에만 마운트).
 */
export function PageviewBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const payload = JSON.stringify({
      path: pathname,
      referer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/metrics/pageview', blob);
      } else {
        fetch('/api/metrics/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // 어떤 이유로든 실패해도 무시 — 사용자 UX 영향 없게
    }
  }, [pathname]);

  return null;
}
