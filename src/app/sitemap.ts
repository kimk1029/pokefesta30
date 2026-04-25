import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://poke-30.com';

/**
 * 정적 + 동적 (열린 거래글) 라우트.
 * 빌드 시 한 번 + 재검증 ISR 로 갱신.
 * 실패 시 정적 라우트만 반환 — 사이트맵 자체가 비는 일은 없게.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,        lastModified: now, changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${SITE_URL}/feed`,    lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${SITE_URL}/map`,     lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/trade`,   lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${SITE_URL}/cards`,   lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${SITE_URL}/live`,    lastModified: now, changeFrequency: 'hourly',  priority: 0.7 },
    { url: `${SITE_URL}/report`,  lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/terms`,   lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    const trades = await prisma.trade.findMany({
      where: { status: 'open' },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });
    const tradeRoutes: MetadataRoute.Sitemap = trades.map((t) => ({
      url: `${SITE_URL}/trade/${t.id}`,
      lastModified: t.updatedAt,
      changeFrequency: 'daily',
      priority: 0.6,
    }));
    return [...staticRoutes, ...tradeRoutes];
  } catch {
    return staticRoutes;
  }
}
