/**
 * 모든 화면 상단에 노출되는 "비공식 팬 프로젝트" 면책 배너.
 * 공식 행사·기업 사칭으로 오인되지 않도록 명시 — Google Safe Browsing 권장 패턴.
 */
export function UnofficialBanner() {
  return (
    <div
      role="note"
      aria-label="비공식 팬 프로젝트 안내"
      style={{
        background: 'var(--ink)',
        color: 'var(--yel)',
        padding: '7px 12px',
        fontFamily: 'var(--f1)',
        fontSize: 8,
        lineHeight: 1.6,
        letterSpacing: 0.3,
        textAlign: 'center',
        borderBottom: '2px solid var(--yel-dk)',
      }}
    >
      ⚠ 비공식 팬 프로젝트 · Pokémon · The Pokémon Company 와 무관합니다
    </div>
  );
}
