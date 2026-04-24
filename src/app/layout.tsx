import type { Metadata, Viewport } from 'next';
import { getServerSession } from 'next-auth';
import type { ReactNode } from 'react';
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

export const metadata: Metadata = {
  title: '포케페스타30 · 잉어킹 프로모 허브',
  description:
    '포켓몬 30주년 메가페스타 잉어킹 프로모 실시간 현황 · 사용자 제보 기반 혼잡도 허브',
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
