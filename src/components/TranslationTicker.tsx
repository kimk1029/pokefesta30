/**
 * 통합검색 헤더 아래 전광판(마퀴).
 * 최근 추가된 한글→일본어 검색 변환 항목을 왼쪽으로 흐르듯 보여준다.
 * 새 변환어를 추가하면 UPDATES 배열에 한 줄만 추가.
 */

interface Update {
  ko: string;
  ja: string;
}

// 최근 추가 순(위가 최신). 새 항목은 맨 위에.
const UPDATES: Update[] = [
  { ko: '25주년', ja: '25th' },
  { ko: '서포터', ja: 'サポート' },
  { ko: '트레이너스', ja: 'トレーナーズ' },
  { ko: '아이템', ja: 'グッズ' },
  { ko: '스타디움', ja: 'スタジアム' },
  { ko: '도구', ja: 'ポケモンのどうぐ' },
];

function Items() {
  return (
    <>
      {UPDATES.map((u, i) => (
        <span className="tl-ticker-item" key={`${u.ko}-${i}`}>
          NEW <b>{u.ko}</b>
          <span className="tl-arr">→</span>
          <b>{u.ja}</b> 검색 추가
        </span>
      ))}
    </>
  );
}

export function TranslationTicker() {
  return (
    <div className="tl-ticker" aria-label="최근 추가된 검색 변환어">
      {/* 끊김 없는 루프를 위해 동일 목록 2벌 (-50% 이동) */}
      <div className="tl-ticker-track">
        <Items />
        <Items />
      </div>
    </div>
  );
}
