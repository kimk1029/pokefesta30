/**
 * 하단 네비게이션(탭바) 스타일 설정.
 * - 'integrated'(통합형, 기본): 하단에 꽉 찬 고정 탭바.
 * - 'floating'(분리형): 양옆/아래 여백을 두고 둥글게 떠 있는 단일 플로팅 바.
 * 마이페이지 설정에서 전환. 앱(mobile/src/lib/navPrefs.ts)과 동일 컨셉.
 */
export type NavStyle = 'integrated' | 'floating';

export const NAV_STYLE_KEY = 'pf30:navStyle';
export const DEFAULT_NAV_STYLE: NavStyle = 'integrated';

export function loadNavStyle(): NavStyle {
  if (typeof window === 'undefined') return DEFAULT_NAV_STYLE;
  try {
    const v = window.localStorage.getItem(NAV_STYLE_KEY);
    return v === 'floating' || v === 'integrated' ? v : DEFAULT_NAV_STYLE;
  } catch {
    return DEFAULT_NAV_STYLE;
  }
}

export function saveNavStyle(s: NavStyle): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NAV_STYLE_KEY, s);
  } catch {
    // ignore quota
  }
}
