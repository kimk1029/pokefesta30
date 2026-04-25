/** 광고 노출 비콘 — fire-and-forget. 실패해도 무시. */
export function fireAdBeacon(network: string, slotId: string): void {
  try {
    const payload = JSON.stringify({ network, slotId });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/metrics/ad', blob);
    } else {
      fetch('/api/metrics/ad', {
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
