'use client';

import { useHomePrefs } from './HomePrefsProvider';

/**
 * 마이페이지 설정 영역의 "메인에 내 포트폴리오 보이기" 토글 행.
 * off(기본) 이면 홈 메인에서 토탈 포트폴리오 hero 를 숨긴다.
 * (내 컬렉션 상단에는 이 설정과 무관하게 항상 노출.)
 */
export function ShowPortfolioSettingsItem() {
  const { showPortfolioOnMain, toggleShowPortfolioOnMain } = useHomePrefs();
  const on = showPortfolioOnMain;

  return (
    <button
      type="button"
      className="my-item"
      onClick={toggleShowPortfolioOnMain}
      aria-label="메인에 내 포트폴리오 보이기"
      aria-pressed={on}
    >
      <div
        className="mi-icon"
        style={{
          background: on ? 'var(--grn)' : 'var(--pap3)',
          color: on ? 'var(--white)' : 'var(--ink3)',
          fontFamily: 'var(--f1)',
          fontSize: 15,
        }}
      >
        📊
      </div>
      <div className="mi-main">
        메인에 내 포트폴리오 보이기
        <span style={{ color: 'var(--ink3)', marginLeft: 6, fontSize: 10 }}>
          · {on ? '켜짐' : '꺼짐'}
        </span>
      </div>
      {/* 토글 스위치 (CSS 없이 인라인) */}
      <span
        aria-hidden
        style={{
          width: 36,
          height: 20,
          flexShrink: 0,
          borderRadius: 999,
          background: on ? 'var(--grn)' : 'var(--pap3)',
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
