import { TranslationTicker, type SearchRankItem } from '@/components/TranslationTicker';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { translate } from '@/lib/cardTranslate';
import { serverFetch } from '@/lib/apiServer';
import { searchSnkrdunkPage } from './actions';
import { SearchResults } from './SearchResults';

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

      {/* 검색 폼 */}
      <form method="get" className="ko-search-box">
        <div className="ko-search-hint">한국어로 카드명 입력 → 🇯🇵 스니덩 검색</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="예) 리자몽, 피카츄, 이브이"
            autoFocus
            className="ko-search-input"
          />
          <button type="submit" className="ko-search-submit">
            검색
          </button>
        </div>
      </form>

      {!q ? (
        <div
          style={{
            margin: '0 var(--gap)',
            padding: 24,
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink3)',
            textAlign: 'center',
            lineHeight: 1.8,
          }}
        >
          한국어로 카드명을 입력해보세요.<br />
          🇯🇵 자동으로 일본어로 번역해 스니덩에서 검색합니다.
        </div>
      ) : (
        <>
          {/* 번역 결과 / 카운트 */}
          <div className="search-panel search-panel--muted">
            입력: <b style={{ color: 'var(--ink)' }}>{q}</b>
            {ja && ja !== q ? (
              <>
                <br />
                🇯🇵 JA: <b style={{ color: 'var(--red)' }}>{ja}</b>
              </>
            ) : null}
          </div>

          <SearchResults q={q} ja={ja} initialHits={initialHits} initialHasMore={initialHasMore} />
        </>
      )}

      <div className="bggap" />
    </>
  );
}
