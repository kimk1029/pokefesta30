import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '아르보TCG',
    short_name: '아르보TCG',
    description: '포켓몬 TCG 카드 거래, 시세 확인, 커뮤니티 앱',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#E8DFB8',
    theme_color: '#E63946',
    orientation: 'portrait',
    icons: [
      {
        src: '/app-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/app-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
