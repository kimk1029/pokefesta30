'use client';

/** 리스트 카드 우상단 관심목록 별 토글 버튼. 카드 Link 위에 절대배치. */
export function FavoriteStar({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={active ? '관심목록에서 제거' : '관심목록에 추가'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 3,
        width: 30,
        height: 30,
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        fontSize: 16,
        lineHeight: 1,
        color: active ? 'var(--ink)' : 'var(--ink2)',
        background: active ? 'var(--gold)' : 'rgba(255,255,255,.88)',
        border: '2px solid var(--ink)',
        cursor: 'pointer',
        boxShadow: '2px 2px 0 var(--ink)',
      }}
    >
      {active ? '★' : '☆'}
    </button>
  );
}
