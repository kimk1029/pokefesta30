import type { Metadata } from 'next';
import { CommunityScreen } from '@/components/screens/CommunityScreen';
import { serverFetch } from '@/lib/apiServer';
import type { FeedPost, Trade } from '@/lib/types';

export const metadata: Metadata = {
  title: '피드',
  description:
    '포켓몬 TCG 트레이너들의 실시간 피드 — 카드 자랑, 개봉 후기, 행사 소식을 한곳에서.',
  alternates: { canonical: '/feed' },
  openGraph: {
    title: '피드 · 포케페스타30',
    description: '포켓몬 TCG 트레이너들의 실시간 피드',
    url: '/feed',
  },
};

export const revalidate = 30;

export default async function Page() {
  const [feedResp, tradesResp] = await Promise.all([
    serverFetch<{ items: FeedPost[]; nextCursor: string | null }>(
      '/api/feeds?limit=20',
      { auth: false },
    ),
    serverFetch<{ data: Trade[] }>('/api/trades?limit=30', { auth: false }),
  ]);
  return (
    <CommunityScreen
      initialFeed={feedResp.data?.items ?? []}
      trades={tradesResp.data?.data ?? []}
    />
  );
}
