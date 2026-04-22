import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Tabbar } from '@/components/Tabbar';
import './globals.css';

export const metadata: Metadata = {
  title: '포케페스타30 · 잉어킹 프로모 허브',
  description: '포켓몬 30주년 메가페스타 잉어킹 프로모 실시간 현황 · 사용자 제보 기반 혼잡도 허브',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#EDE7DA',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&family=DotGothic16&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="page-wrap">
          <div className="phone">
            <div className="phone-screen">
              {children}
            </div>
            <Tabbar />
          </div>
        </div>
      </body>
    </html>
  );
}
