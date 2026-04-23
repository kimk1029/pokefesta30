'use client';

import { signIn } from 'next-auth/react';
import { PixelBall } from './PixelBall';

interface Props {
  /** 로그인 후 돌아갈 경로. 기본값 / */
  callbackUrl?: string;
  /** "로그인 없이 둘러보기" 숨김 (마이페이지 로그인 유도 카드 등에서) */
  hideSkip?: boolean;
  onSkip?: () => void;
}

export function LoginScreen({ callbackUrl = '/', hideSkip, onSkip }: Props) {
  const go = (provider: 'kakao' | 'naver' | 'google') => {
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="login-screen">
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
        <button type="button" className="login-btn login-btn-kakao" onClick={() => go('kakao')}>
          <div className="login-btn-icon">💬</div>
          <div className="login-btn-txt">
            <div className="login-btn-name">카카오로 시작하기</div>
            <div className="login-btn-desc">카카오 계정으로 간편 로그인</div>
          </div>
        </button>
        <button type="button" className="login-btn login-btn-naver" onClick={() => go('naver')}>
          <div className="login-btn-icon">N</div>
          <div className="login-btn-txt">
            <div className="login-btn-name">네이버로 시작하기</div>
            <div className="login-btn-desc">네이버 계정으로 간편 로그인</div>
          </div>
        </button>
        <button type="button" className="login-btn login-btn-google" onClick={() => go('google')}>
          <div className="login-btn-icon">G</div>
          <div className="login-btn-txt">
            <div className="login-btn-name">구글로 시작하기</div>
            <div className="login-btn-desc">Google 계정으로 간편 로그인</div>
          </div>
        </button>
      </div>
      {!hideSkip && (
        <button type="button" className="login-skip" onClick={onSkip}>
          로그인 없이 둘러보기 →
        </button>
      )}
    </div>
  );
}
