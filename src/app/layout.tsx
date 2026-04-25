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

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.poke-30.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '포케페스타30 — 비공식 팬 커뮤니티',
    template: '%s · 포케페스타30 (팬 프로젝트)',
  },
  description:
    '포켓몬 팬이 만든 비공식 커뮤니티 — 사용자 제보 기반 매장 혼잡도 정보, 카드 거래, 오리파. The Pokémon Company 와 무관합니다.',
  keywords: [
    '포켓몬 팬커뮤니티', '포켓몬 카드 거래', '포켓몬 카드',
    '카드 시세', '오리파', '팬 프로젝트',
  ],
  applicationName: '포케페스타30 (팬 프로젝트)',
  authors: [{ name: 'pokefesta30 fans' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: '포케페스타30 (비공식 팬 프로젝트)',
    title: '포케페스타30 — 비공식 팬 커뮤니티',
    description:
      '비공식 팬 프로젝트 · 매장 혼잡도 사용자 제보 · 카드 거래 · 오리파',
    images: [{ url: '/icon.svg', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '포케페스타30 (팬 프로젝트)',
    description: '비공식 팬 커뮤니티 · 매장 혼잡도 사용자 제보',
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
