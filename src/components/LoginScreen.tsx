'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { PixelBall } from './PixelBall';

interface Props {
  /** 로그인 후 돌아갈 경로. 기본값 / */
  callbackUrl?: string;
  /** "로그인 없이 둘러보기" 숨김 (마이페이지 로그인 유도 카드 등에서) */
  hideSkip?: boolean;
  onSkip?: () => void;
}

type Provider = 'kakao' | 'naver' | 'google';

export function LoginScreen({ callbackUrl = '/', hideSkip, onSkip }: Props) {
  const [pending, setPending] = useState<Provider | null>(null);

  const go = (provider: Provider) => {
    if (pending) return;
    setPending(provider);
    // signIn 이 브라우저를 OAuth URL 로 navigate 시킴 → 이 페이지는 곧 언마운트됨.
    // 혹시 오류로 언마운트 전에 돌아오면 pending 해제해주기 위해 timeout 만 보험.
    signIn(provider, { callbackUrl }).catch(() => setPending(null));
    setTimeout(() => setPending(null), 10_000);
  };

  const spinning = (p: Provider) => pending === p;

  return (
    <div className="login-screen">
      {pending && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,.55)',
            display: 'grid',
            placeItems: 'center',
            animation: 'pf-fade-in 150ms linear',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--ink)',
                background: `linear-gradient(to bottom,
                  var(--red) 0,var(--red) 46%,
                  var(--ink) 46%,var(--ink) 54%,
                  var(--white) 54%,var(--white) 100%)`,
                boxShadow: 'inset 0 4px 0 var(--red-lt),inset 0 -4px 0 rgba(0,0,0,.15)',
                position: 'relative',
                animation: 'pf-ball-spin 0.7s linear infinite',
              }}
            >
              <span
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--white)', border: '2px solid var(--ink)',
                  transform: 'translate(-50%,-50%)',
                }}
              />
            </div>
            <div style={{ color: 'var(--yel)', fontFamily: 'var(--f1)', fontSize: 9, letterSpacing: 1 }}>
              {pending === 'kakao' && '카카오 로그인 창 여는 중...'}
              {pending === 'naver' && '네이버 로그인 창 여는 중...'}
              {pending === 'google' && '구글 로그인 창 여는 중...'}
            </div>
          </div>
        </div>
      )}

      <div className="login-logo-wrap">
        <PixelBall size={72} />
        <div className="login-title">
          포케페스타30
          <br />
          잉어킹 프로모
        </div>
        <div className="login-sub">
          성수 현장 실시간 정보 허브
          <br />
          로그인하고 제보 · 거래에 참여하세요
        </div>
      </div>
      <div className="login-divider">── 소셜 로그인 ──</div>
      <div className="login-btns">
        <button
          type="button"
          className="login-btn login-btn-kakao"
          onClick={() => go('kakao')}
          disabled={!!pending}
        >
          <div className="login-btn-icon">{spinning('kakao') ? <Spin /> : '💬'}</div>
          <div className="login-btn-txt">
            <div className="login-btn-name">카카오로 시작하기</div>
            <div className="login-btn-desc">카카오 계정으로 간편 로그인</div>
          </div>
        </button>
        <button
          type="button"
          className="login-btn login-btn-naver"
          onClick={() => go('naver')}
          disabled={!!pending}
        >
          <div className="login-btn-icon">{spinning('naver') ? <Spin /> : 'N'}</div>
          <div className="login-btn-txt">
            <div className="login-btn-name">네이버로 시작하기</div>
            <div className="login-btn-desc">네이버 계정으로 간편 로그인</div>
          </div>
        </button>
        <button
          type="button"
          className="login-btn login-btn-google"
          onClick={() => go('google')}
          disabled={!!pending}
        >
          <div className="login-btn-icon">{spinning('google') ? <Spin /> : 'G'}</div>
          <div className="login-btn-txt">
            <div className="login-btn-name">구글로 시작하기</div>
            <div className="login-btn-desc">Google 계정으로 간편 로그인</div>
          </div>
        </button>
      </div>
      {!hideSkip && (
        <button type="button" className="login-skip" onClick={onSkip} disabled={!!pending}>
          로그인 없이 둘러보기 →
        </button>
      )}
      <div
        style={{
          position: 'relative',
          marginTop: 14,
          padding: '0 12px',
          fontFamily: 'var(--f1)',
          fontSize: 7,
          lineHeight: 1.8,
          color: 'rgba(255,255,255,.55)',
          textAlign: 'center',
          letterSpacing: 0.3,
        }}
      >
        로그인 시{' '}
        <a
          href="/terms"
          style={{ color: 'var(--yel)', textDecoration: 'underline' }}
        >
          이용약관
        </a>
        {' · '}
        <a
          href="/privacy"
          style={{ color: 'var(--yel)', textDecoration: 'underline' }}
        >
          개인정보처리방침
        </a>
        에 동의한 것으로 간주됩니다
      </div>
      <div
        style={{
          position: 'relative',
          marginTop: 10,
          padding: '0 6px',
          fontFamily: 'var(--f1)',
          fontSize: 7,
          lineHeight: 1.7,
          color: 'rgba(255,255,255,.35)',
          textAlign: 'center',
          letterSpacing: 0.3,
        }}
      >
        Pokémon © Nintendo · Game Freak · The Pokémon Company
      </div>
    </div>
  );
}

function Spin() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        animation: 'pf-ball-spin 0.6s linear infinite',
      }}
    />
  );
}
