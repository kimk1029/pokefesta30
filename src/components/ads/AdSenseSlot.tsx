'use client';

import { useEffect, useRef } from 'react';
import { fireAdBeacon } from './fireAdBeacon';

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Google AdSense 인피드 슬롯.
 * SDK script 는 layout.tsx 에서 1회 로드됨.
 */
export function AdSenseSlot({ slotId }: { slotId: string }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    if (!CLIENT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
      pushed.current = true;
    } catch {
      /* SDK 미로드 시 무시 — 다음 마운트에서 재시도 */
    }
    // 자체 노출 카운트 (광고사 콘솔과 별개로 우리 admin 에서 추이 보기용)
    fireAdBeacon('adsense', slotId);
  }, [slotId]);

  if (!CLIENT) {
    return <AdPlaceholder label="AdSense" />;
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', minHeight: 90 }}
      data-ad-client={CLIENT}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

function AdPlaceholder({ label }: { label: string }) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: 90,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--pap2)',
        fontFamily: 'var(--f1)',
        fontSize: 8,
        color: 'var(--ink3)',
        letterSpacing: 1,
      }}
    >
      {label} (slot — env 미설정)
    </div>
  );
}
