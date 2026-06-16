'use client';

import { useNavPrefs } from './NavPrefsProvider';

/**
 * 마이페이지 설정 — 하단 네비게이션 스타일 토글.
 * off(기본)=통합형(꽉 찬 고정 탭바) / on=분리형(둥근 플로팅 바).
 */
export function NavStyleSettingsItem() {
  const { navStyle, toggleNavStyle } = useNavPrefs();
  const on = navStyle === 'floating';

  return (
    <button
      type="button"
      className="my-item"
      onClick={toggleNavStyle}
      aria-label="네비게이션 스타일"
      aria-pressed={on}
    >
      <div
        className="mi-icon"
        style={{
          background: on ? 'var(--blu)' : 'var(--pap3)',
          color: on ? 'var(--white)' : 'var(--ink3)',
          fontFamily: 'var(--f1)',
          fontSize: 15,
        }}
      >
        🧭
      </div>
      <div className="mi-main">
        네비게이션 스타일
        <span style={{ color: 'var(--ink3)', marginLeft: 6, fontSize: 10 }}>
          · {on ? '분리형' : '통합형'}
        </span>
      </div>
      <span
        aria-hidden
        style={{
          width: 36,
          height: 20,
          flexShrink: 0,
          borderRadius: 999,
          background: on ? 'var(--blu)' : 'var(--pap3)',
          position: 'relative',
          transition: 'background .15s',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--white)',
            transition: 'left .15s',
            boxShadow: '0 1px 2px rgba(0,0,0,.3)',
          }}
        />
      </span>
    </button>
  );
}
