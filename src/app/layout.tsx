import type { Metadata, Viewport } from 'next';
import { getServerSession } from 'next-auth';
import type { ReactNode } from 'react';
import { AdScripts } from '@/components/ads/AdScripts';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { InAppBrowserNotice } from '@/components/InAppBrowserNotice';
import { InventoryProvider } from '@/components/InventoryProvider';
import { PageviewBeacon } from '@/components/PageviewBeacon';
import { PhoneShell } from '@/components/PhoneShell';
import { Providers } from '@/components/Providers';
import { RouteProgress } from '@/components/RouteProgress';
import { ToastProvider } from '@/components/ToastProvider';
import { UnreadProvider } from '@/components/UnreadProvider';
import { authOptions } from '@/lib/auth';
import { getUnreadCount } from '@/lib/messages';
import { getMyInventory } from '@/lib/queries';
import 'galmuri/dist/galmuri.css';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://poke-30.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '포케페스타30 · 잉어킹 프로모 실시간 혼잡도',
    template: '%s · 포케페스타30',
  },
  description:
    '포켓몬 30주년 메가페스타 잉어킹 프로모 실시간 현황 · 사용자 제보 기반 매장별 혼잡도 · 카드 시세 · 거래 허브',
  keywords: [
    '포켓몬', '포케페스타', '포케페스타30', '잉어킹 프로모',
    '포켓몬 30주년', '메가페스타', '포켓몬 카드', '카드 거래', '오리파',
  ],
  applicationName: '포케페스타30',
  authors: [{ name: 'pokefesta30' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: '포케페스타30',
    title: '포케페스타30 · 잉어킹 프로모 실시간 혼잡도',
    description:
      '잉어킹 프로모 매장별 혼잡도 · 사용자 실시간 제보 · 카드 시세 · 거래',
    images: [{ url: '/icon.svg', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '포케페스타30',
    description: '잉어킹 프로모 실시간 혼잡도 허브',
    images: ['/icon.svg'],
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
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#E8DFB8',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const [inventory, unreadCount] = await Promise.all([
    userId ? getMyInventory(userId) : Promise.resolve(null),
    userId ? getUnreadCount(userId).catch(() => 0) : Promise.resolve(0),
  ]);

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DotGothic16&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <GoogleAnalytics />
        <AdScripts />
        <Providers>
          <ToastProvider>
            <InventoryProvider initial={inventory} isLoggedIn={!!userId}>
              <UnreadProvider initialCount={unreadCount}>
                <RouteProgress />
                <PageviewBeacon />
                <InAppBrowserNotice />
                <PhoneShell>{children}</PhoneShell>
              </UnreadProvider>
            </InventoryProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
