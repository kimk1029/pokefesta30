'use client';

import { PixelBall } from './PixelBall';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
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
        <button type="button" className="login-btn login-btn-kakao" onClick={onLogin}>
          <div className="login-btn-icon">💬</div>
          <div className="login-btn-txt">
            <div className="login-btn-name">카카오로 시작하기</div>
            <div className="login-btn-desc">카카오 계정으로 간편 로그인</div>
          </div>
        </button>
        <button type="button" className="login-btn login-btn-naver" onClick={onLogin}>
          <div className="login-btn-icon">N</div>
          <div className="login-btn-txt">
            <div className="login-btn-name">네이버로 시작하기</div>
            <div className="login-btn-desc">네이버 계정으로 간편 로그인</div>
          </div>
        </button>
        <button type="button" className="login-btn login-btn-google" onClick={onLogin}>
          <div className="login-btn-icon">G</div>
          <div className="login-btn-txt">
            <div className="login-btn-name">구글로 시작하기</div>
            <div className="login-btn-desc">Google 계정으로 간편 로그인</div>
          </div>
        </button>
      </div>
      <button type="button" className="login-skip" onClick={onLogin}>
        로그인 없이 둘러보기 →
      </button>
    </div>
  );
}
