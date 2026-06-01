/**
 * 카드 검색 전광판 — 인기 검색어 순위 1~10위를 LED 전광판처럼 흘려보낸다.
 * 좌측 고정 타이틀("인기 검색어") + 우측 스크롤 랭킹.
 * items 가 비면 안내 문구로 폴백.
 */

export interface SearchRankItem {
  query: string;
  count: number;
}

function RankList({ ranks }: { ranks: SearchRankItem[] }) {
  return (
    <>
      {ranks.map((r, i) => (
        <span className="tl-ticker-item" key={`${r.query}-${i}`}>
          <b className={`tl-rank${i < 3 ? ' top' : ''}`}>{i + 1}</b>
          <span className="tl-q">{r.query}</span>
        </span>
      ))}
    </>
  );
}

function Fallback() {
  return (
    <span className="tl-ticker-item">
      <span className="tl-q">아직 집계된 검색어가 없어요 — 카드를 검색해보세요</span>
    </span>
  );
}

export function TranslationTicker({ items = [] }: { items?: SearchRankItem[] }) {
  const ranks = items.slice(0, 10);
  const hasData = ranks.length > 0;
  return (
    <div className="tl-ticker" aria-label="인기 검색어 순위">
      <div className="tl-ticker-title">
        <span className="tl-ticker-live">●</span> 인기 검색어
      </div>
      <div className="tl-ticker-viewport">
        {/* 끊김 없는 루프를 위해 동일 목록 2벌 (-50% 이동) */}
        <div className="tl-ticker-track">
          {hasData ? (
            <>
              <RankList ranks={ranks} />
              <RankList ranks={ranks} />
            </>
          ) : (
            <>
              <Fallback />
              <Fallback />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
