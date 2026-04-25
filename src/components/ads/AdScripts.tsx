import Script from 'next/script';

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/**
 * 광고 SDK 전역 로더.
 * - AdSense: 1회만 로드 (slot push 는 컴포넌트가 처리)
 * - AdFit:   per-mount 로 AdFitSlot 내부에서 직접 주입 (전역 로드 안 함)
 */
export function AdScripts() {
  return (
    <>
      {ADSENSE_CLIENT && (
        <Script
          id="adsense-loader"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      )}
    </>
  );
}
