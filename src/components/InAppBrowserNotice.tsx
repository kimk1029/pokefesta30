'use client';

import { useEffect, useState } from 'react';

/**
 * in-app 브라우저(카카오톡/네이버앱/인스타/페이스북/라인 등) 에서 접속 시 배너 노출.
 * 네이버 OAuth 가 in-app 을 차단해서(disp_stat=207, inapp_view=true) 로그인이 실패하므로
 * 유저에게 외부 브라우저로 열라고 안내.
 */

const IN_APP_PATTERNS = [
  'kakaotalk',
  'naver(', // 네이버 앱
  'instagram',
  'fban', 'fbav',   // Facebook
  'line/',
  'everytime',
  'twitter',
];

function detectInApp(ua: string): string | null {
  const lo = ua.toLowerCase();
  for (const p of IN_APP_PATTERNS) {
    if (lo.includes(p)) return p.replace(/[()]/g, '');
  }
  return null;
}

export function InAppBrowserNotice() {
  const [source, setSource] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setSource(detectInApp(navigator.userAgent));
  }, []);

  const openExternal = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const ua = navigator.userAgent.toLowerCase();

    // 카카오톡: 외부 브라우저로 강제 오픈
    if (ua.includes('kakaotalk')) {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
      return;
    }
    // 라인
    if (ua.includes('line/')) {
      window.location.href = url + (url.includes('?') ? '&' : '?') + 'openExternalBrowser=1';
      return;
    }
    // 그 외: 유저가 직접 브라우저 주소창에 열어야 하므로 URL 복사 안내
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
      alert('URL 이 복사되었습니다.\n크롬/사파리 주소창에 붙여넣어 열어주세요.\n\n' + url);
    } else {
      alert('외부 브라우저(크롬/사파리)에서 아래 주소로 접속해주세요.\n\n' + url);
    }
  };

  if (!source || closed) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: 'var(--ink)',
        color: 'var(--yel)',
        padding: '12px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        boxShadow: '0 3px 0 rgba(0,0,0,.2)',
        fontFamily: 'var(--f1)',
        fontSize: 9,
        letterSpacing: 0.3,
        lineHeight: 1.6,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--yel)', fontSize: 10 }}>⚠ 내장 브라우저 감지</div>
        <div style={{ color: 'var(--white)', fontSize: 8, marginTop: 4 }}>
          네이버·구글 로그인은 내장 브라우저에서 차단됩니다.<br />
          크롬/사파리 등 외부 브라우저로 열어주세요.
        </div>
      </div>
      <button
        type="button"
        onClick={openExternal}
        style={{
          padding: '6px 10px',
          background: 'var(--yel)',
          color: 'var(--ink)',
          border: 'none',
          fontFamily: 'var(--f1)',
          fontSize: 8,
          letterSpacing: 0.5,
          cursor: 'pointer',
          boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink),2px 2px 0 var(--ink)',
        }}
      >
        외부에서 열기
      </button>
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="닫기"
        style={{
          background: 'transparent',
          color: 'var(--white)',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          padding: '0 4px',
          opacity: 0.7,
        }}
      >
        ✕
      </button>
    </div>
  );
}
