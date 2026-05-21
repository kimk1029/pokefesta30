import type { MetadataRoute } from 'next';
import { serverFetch } from '@/lib/apiServer';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.poke-30.com';

export const revalidate = 3600;

interface TradeRow {
  id: number;
  updatedAt: string;
}

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

  const r = await serverFetch<{ data: TradeRow[] }>(
    '/api/trades?status=open&limit=1000',
    { auth: false },
  );
  const trades = r.data?.data ?? [];
  const tradeRoutes: MetadataRoute.Sitemap = trades.map((t) => ({
    url: `${SITE_URL}/trade/${t.id}`,
    lastModified: new Date(t.updatedAt),
    changeFrequency: 'daily',
    priority: 0.6,
  }));
  return [...staticRoutes, ...tradeRoutes];
}
