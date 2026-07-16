'use client';

import { GAME_OPTIONS } from '@/lib/gamePrefs';
import { useGamePrefs } from './GamePrefsProvider';

/**
 * 마이페이지 설정 — 카드 게임(포켓몬/원피스/유희왕/스포츠) 표시 토글 행 묶음.
 * 켠 게임만 홈 인기·박스 캐러셀과 시세확인(팩) 목록에 나온다.
 * 전부 켜면 모든 게임 카드가 함께 나오고, 최소 1개는 켜져 있어야 한다.
 */
export function GameFilterSettingsItem() {
  const { enabledGames, toggleGame } = useGamePrefs();

  return (
    <>
      {GAME_OPTIONS.map((g) => {
        const on = enabledGames.includes(g.id);
        const last = on && enabledGames.length <= 1;
        return (
          <button
            key={g.id}
            type="button"
            className="my-item"
            onClick={() => toggleGame(g.id)}
            aria-label={`${g.label} 카드 보기`}
            aria-pressed={on}
            style={last ? { opacity: 0.6 } : undefined}
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
              {g.emoji}
            </div>
            <div className="mi-main">
              {g.label} 카드 보기
              <span style={{ color: 'var(--ink3)', marginLeft: 6, fontSize: 10 }}>
                · {last ? '켜짐 (최소 1개 필요)' : on ? '켜짐' : '꺼짐'}
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
      })}
    </>
  );
}
