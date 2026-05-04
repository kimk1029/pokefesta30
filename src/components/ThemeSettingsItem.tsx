'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { THEMES, type ThemeId } from '@/lib/theme';

const SWATCH_BG: Record<ThemeId, string> = {
  pokemon: '#E63946',
  default: '#FFD23F',
  minimal: '#0D9488',
};

const SWATCH_DOT: Record<ThemeId, string> = {
  pokemon: '#FFFFFF',
  default: '#1A1A2E',
  minimal: '#F7F3E3',
};

/**
 * 마이페이지 설정 영역의 "테마" 행. 클릭하면 픽커 모달 오픈.
 * 서버 컴포넌트(MyScreen)에 끼우는 인터랙티브 어덕터.
 */
export function ThemeSettingsItem() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <>
      <button
        type="button"
        className="my-item"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <div
          className="mi-icon"
          style={{ background: SWATCH_BG[theme], color: SWATCH_DOT[theme] }}
        >
          🎨
        </div>
        <div className="mi-main">
          테마 <span style={{ color: 'var(--ink3)', marginLeft: 6, fontSize: 9 }}>· {current.label}</span>
        </div>
        <span className="mi-arr">▶</span>
      </button>

      {open && (
        <div
          className="avatar-overlay"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-label="테마 선택"
        >
          <div
            className="avatar-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 320, gap: 10, padding: 14 }}
          >
            <div className="avatar-modal-head">
              <span>테마 선택</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="avatar-close"
              >
                ✕
              </button>
            </div>

            <div className="avatar-modal-hint">
              현재 화면 전체에 즉시 반영되며, 다음 방문에도 유지됩니다.
            </div>

            <div className="theme-pick-grid">
              {THEMES.map((t) => {
                const active = t.id === theme;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-pick-tile${active ? ' active' : ''}`}
                    onClick={() => {
                      setTheme(t.id);
                      setOpen(false);
                    }}
                  >
                    <div
                      className="tp-swatch"
                      style={{ background: SWATCH_BG[t.id] }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          background: SWATCH_DOT[t.id],
                          boxShadow: '0 0 0 1px var(--ink)',
                          display: 'block',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="tp-name">{t.label}</div>
                      <div className="tp-desc">{t.desc}</div>
                    </div>
                    {active && (
                      <span
                        style={{
                          fontFamily: 'var(--f1)',
                          fontSize: 9,
                          color: 'var(--ink)',
                          letterSpacing: 0.5,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
