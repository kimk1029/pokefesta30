import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { ActionTracker } from '@/components/ActionTracker';
import { AdScripts } from '@/components/ads/AdScripts';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { InAppBrowserNotice } from '@/components/InAppBrowserNotice';
import { InventoryProvider } from '@/components/InventoryProvider';
import { PageviewBeacon } from '@/components/PageviewBeacon';
import { PhoneShell } from '@/components/PhoneShell';
import { Providers } from '@/components/Providers';
import { RouteProgress } from '@/components/RouteProgress';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { HomePrefsProvider } from '@/components/HomePrefsProvider';
import { NavPrefsProvider } from '@/components/NavPrefsProvider';
import { PriceModeProvider } from '@/components/PriceModeProvider';
import { ToastProvider } from '@/components/ToastProvider';
import { UnreadProvider } from '@/components/UnreadProvider';
import 'galmuri/dist/galmuri.css';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.poke-30.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '포케페스타30 — 포켓몬 TCG 커뮤니티',
    template: '%s · 포케페스타30',
  },
  description:
    '포켓몬 TCG 카드 거래·시세 확인 + 30주년 행사 현장 상황 공유. 트레이너들을 위한 커뮤니티.',
  keywords: [
    '포켓몬 TCG', '포켓몬 카드 거래', '포켓몬 카드 시세',
    '포켓몬 30주년', '포켓몬 페스타', '카드 시세 검색',
  ],
  applicationName: '포케페스타30',
  authors: [{ name: 'pokefesta30' }],
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/app-icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/app-icon.png', sizes: '512x512', type: 'image/png' }],
    shortcut: ['/app-icon.png'],
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: '포케페스타30 — 포켓몬 TCG 커뮤니티',
    title: '포케페스타30 — 포켓몬 TCG 커뮤니티',
    description:
      'TCG 카드 거래 · 카드 시세 검색 · 행사 현장 정보 공유',
    images: [{ url: '/meta.png', width: 1672, height: 941 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '포케페스타30 — 포켓몬 TCG 커뮤니티',
    description: 'TCG 카드 거래 · 시세 · 행사 정보 공유',
    images: ['/meta.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification':
        process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION ?? '',
      'google-adsense-account': 'ca-pub-8606099213555265',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F8FA',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DotGothic16&family=Noto+Serif+KR:wght@400;600;700;900&family=Pirata+One&family=Gugi&family=Gowun+Batang:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* Pretendard — 클린(CardVault) 테마 본문 폰트 */}
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
        />
        {/* 테마 부트스트랩 — hydration 전에 동기 실행, FOUC 방지 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pokefesta-theme');if(t==='pokemon'||t==='onepiece'||t==='yugioh'||t==='sports'||t==='clean'||t==='dark')document.documentElement.setAttribute('data-theme',t);else document.documentElement.setAttribute('data-theme','clean');}catch(e){document.documentElement.setAttribute('data-theme','clean');}})();`,
          }}
        />
      </head>
      <body>
        <GoogleAnalytics />
        <AdScripts />
        <Providers>
          <CurrencyProvider>
            <PriceModeProvider>
              <HomePrefsProvider>
              <NavPrefsProvider>
              <ToastProvider>
                <InventoryProvider>
                  <UnreadProvider>
                <Suspense fallback={null}>
                  <RouteProgress />
                </Suspense>
                <PageviewBeacon />
                <ActionTracker />
                <InAppBrowserNotice />
                <PhoneShell>{children}</PhoneShell>
                  </UnreadProvider>
                </InventoryProvider>
              </ToastProvider>
              </NavPrefsProvider>
              </HomePrefsProvider>
            </PriceModeProvider>
          </CurrencyProvider>
        </Providers>
      </body>
    </html>
  );
}
