/**
 * 홈(메인) 화면 개인화 설정 — 웹 src/lib/homePrefs.ts 와 동일 컨셉.
 * showPortfolioOnMain: 메인 상단에 내 포트폴리오 hero 를 보일지. 기본 false.
 * (컬렉션 상단 hero 는 이 설정과 무관하게 항상 표시.)
 */
import { getString, setString } from '@/lib/kvStore';

export const SHOW_PORTFOLIO_ON_MAIN_KEY = 'pf30:showPortfolioOnMain';
export const DEFAULT_SHOW_PORTFOLIO_ON_MAIN = false;

export function loadShowPortfolioOnMain(): boolean {
  const v = getString(SHOW_PORTFOLIO_ON_MAIN_KEY);
  if (v === '1') return true;
  if (v === '0') return false;
  return DEFAULT_SHOW_PORTFOLIO_ON_MAIN;
}

export function saveShowPortfolioOnMain(on: boolean): void {
  setString(SHOW_PORTFOLIO_ON_MAIN_KEY, on ? '1' : '0');
}
