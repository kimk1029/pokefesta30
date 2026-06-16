import { TranslationTicker, type SearchRankItem } from '@/components/TranslationTicker';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { translate } from '@/lib/cardTranslate';
import { serverFetch } from '@/lib/apiServer';
import { searchSnkrdunkPage } from './actions';
import { SearchPanel } from './SearchPanel';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const ja = q ? translate(q, 'ja') : '';

  // 첫 페이지만 서버에서 미리 채우고, 이후 "더 보기"는 클라이언트가 서버액션으로 페이지를 늘려간다.
  const { hits: initialHits, hasMore: initialHasMore } = ja
    ? await searchSnkrdunkPage(ja, 1)
    : { hits: [], hasMore: false };

  // 검색 로그(한국어 키워드 + 결과 수). serverFetch 가 세션 토큰을 붙여 로그인 시 userId 기록.
  // 로깅 실패가 검색 페이지를 막으면 안 되므로 무시.
  if (q && ja) {
    try {
      await serverFetch('/api/search-log', {
        method: 'POST',
        body: { query: q, resultCount: initialHits.length, source: 'web' },
      });
    } catch {
      /* ignore */
    }
  }

  // 전광판용 인기 검색어 순위 (최근 30일 Top 10)
  const topSearches =
    (await serverFetch<{ items: SearchRankItem[] }>('/api/search-log/top', { auth: false })).data
      ?.items ?? [];

  return (
    <>
      <StatusBar />
      <AppBar title="카드 검색" showBack backHref="/" />
      <TranslationTicker items={topSearches} />

      <SearchPanel
        initialQ={q}
        initialJa={ja}
        initialHits={initialHits}
        initialHasMore={initialHasMore}
      />

      <div className="bggap" />
    </>
  );
}
