'use client';

import { useState } from 'react';

interface Props {
  kakaoId: string;
}

export function KakaoButton({ kakaoId }: Props) {
  const isOpenChat = /^https?:\/\//.test(kakaoId);
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    if (isOpenChat) {
      window.open(kakaoId, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      await navigator.clipboard.writeText(kakaoId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('복사해서 카카오톡에서 검색해주세요 (Ctrl/Cmd+C)', kakaoId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        width: '100%',
        background: '#FEE500',
        border: 'none',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: '#3C1E1E', opacity: 0.6, marginBottom: 2 }}>
          카카오톡 연락처
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#3C1E1E' }}>
          {isOpenChat ? '오픈채팅 열기' : kakaoId}
        </div>
        {!isOpenChat && (
          <div style={{ fontSize: 9, color: '#3C1E1E', opacity: 0.55, marginTop: 4 }}>
            카카오톡 앱에서 ID로 검색해주세요
          </div>
        )}
      </div>
      <div
        style={{
          background: '#3C1E1E',
          color: '#FEE500',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {isOpenChat ? '열기 →' : copied ? '복사됨 ✓' : 'ID 복사'}
      </div>
    </button>
  );
}
