'use client';

import { useEffect, useRef, useState } from 'react';

const ADFIT_SRC = 'https://t1.kakaocdn.net/kas/static/ba.min.js';

interface Props {
  adUnit: string;
  /** AdFit 등록 시 정한 가로 — DAN-iL71cYDIUXbuGNA5 = 320 */
  width?: number;
  /** AdFit 등록 시 정한 세로 — DAN-iL71cYDIUXbuGNA5 = 100 */
  height?: number;
}

/**
 * Kakao AdFit 인피드 배너.
 *
 * 왜 스크립트를 매 마운트마다 주입하나:
 *   AdFit SDK 는 스크립트 로드 시점에 1회 ins 스캔만 수행한다.
 *   SPA(Next.js) 에서 동적으로 ins 가 추가되면 다시 스캔되지 않아 빈칸이 된다.
 *   공식 SDK 가 전역 re-render API 를 제공하지 않으므로,
 *   ins 옆에 스크립트 태그를 새로 append → 새 스크립트가 미렌더 ins 를 처리.
 *
 * NO-AD 처리:
 *   data-ad-unit / data-ad-width / data-ad-height 외에
 *   window 전역 콜백(`adfit_callback_<unit>`)에 함수를 박아두면
 *   광고 미게재 시 호출됨 → fallback UI 노출.
 *
 * 주의:
 *   AdFit 가이드: "광고 스크립트 안의 광고단위 정보(ad-unit/width/height)는
 *   변경하면 안 됨." → ins 마운트 후 attribute 수정 금지.
 */
export function AdFitSlot({ adUnit, width = 320, height = 100 }: Props) {
  const insRef = useRef<HTMLModElement | null>(null);
  const [noAd, setNoAd] = useState(false);

  useEffect(() => {
    if (!adUnit) return;
    const ins = insRef.current;
    if (!ins) return;

    // No-Fill 콜백 등록 (AdFit 이 광고 못 채울 때 호출)
    const cbName = `adfit_cb_${adUnit.replace(/[^a-zA-Z0-9]/g, '_')}`;
    (window as unknown as Record<string, unknown>)[cbName] = () => setNoAd(true);
    ins.setAttribute('data-ad-onfail', cbName);

    // 스크립트를 ins 다음 형제로 append → SDK 재실행 트리거
    const script = document.createElement('script');
    script.src = ADFIT_SRC;
    script.async = true;
    ins.parentNode?.insertBefore(script, ins.nextSibling);

    return () => {
      script.remove();
      try {
        delete (window as unknown as Record<string, unknown>)[cbName];
      } catch {
        /* noop */
      }
    };
  }, [adUnit]);

  if (!adUnit) {
    return <Placeholder height={height} label="AdFit · slot 미설정" />;
  }
  if (noAd) {
    return <Placeholder height={height} label="" />;
  }

  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        width: '100%',
        minHeight: height,
      }}
    >
      <ins
        ref={insRef}
        className="kakao_ad_area"
        style={{ display: 'none', width: '100%' }}
        data-ad-unit={adUnit}
        data-ad-width={String(width)}
        data-ad-height={String(height)}
      />
    </div>
  );
}

function Placeholder({ height, label }: { height: number; label: string }) {
  return (
    <div
      aria-hidden
      style={{
        width: '100%',
        minHeight: height,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--pap2)',
        fontFamily: 'var(--f1)',
        fontSize: 8,
        color: 'var(--ink3)',
        letterSpacing: 1,
      }}
    >
      {label}
    </div>
  );
}
