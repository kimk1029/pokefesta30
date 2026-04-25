'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function PageviewTracker() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!GA_ID || !pathname) return;
    const url = pathname + (search?.toString() ? `?${search.toString()}` : '');
    window.gtag?.('config', GA_ID, { page_path: url });
  }, [pathname, search]);

  return null;
}

/**
 * GA4 — gtag.js + App Router 라우트 변경 추적.
 * NEXT_PUBLIC_GA_ID 비어있으면 아무것도 안 함.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        id="ga-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:true});`}
      </Script>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </>
  );
}
