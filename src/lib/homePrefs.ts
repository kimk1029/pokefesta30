/**
 * 홈(메인) 화면 개인화 설정.
 * - showPortfolioOnMain: 메인 상단에 내 포트폴리오(토탈 평가액 hero)를 보일지.
 *   기본 false — off 이면 메인에선 숨기고 컬렉션 상단에서만 항상 노출.
 *   (컬렉션 상단 hero 는 이 설정과 무관하게 항상 표시.)
 */
export const SHOW_PORTFOLIO_ON_MAIN_KEY = 'pf30:showPortfolioOnMain';
export const DEFAULT_SHOW_PORTFOLIO_ON_MAIN = false;

export function loadShowPortfolioOnMain(): boolean {
  if (typeof window === 'undefined') return DEFAULT_SHOW_PORTFOLIO_ON_MAIN;
  try {
    const v = window.localStorage.getItem(SHOW_PORTFOLIO_ON_MAIN_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
    return DEFAULT_SHOW_PORTFOLIO_ON_MAIN;
  } catch {
    return DEFAULT_SHOW_PORTFOLIO_ON_MAIN;
  }
}

export function saveShowPortfolioOnMain(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SHOW_PORTFOLIO_ON_MAIN_KEY, on ? '1' : '0');
  } catch {
    // ignore quota
  }
}
