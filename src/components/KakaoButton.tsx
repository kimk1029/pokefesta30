'use client';

import { useState } from 'react';

interface Props {
  kakaoId: string;
}

export function KakaoButton({ kakaoId }: Props) {
  const [copied, setCopied] = useState(false);

  const isUrl = kakaoId.startsWith('http');

  const handleClick = async () => {
    if (isUrl) {
      window.open(kakaoId, '_blank');
    } else {
      await navigator.clipboard.writeText(kakaoId).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      background: '#FEE500',
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 11, color: '#3C1E1E', opacity: 0.6, marginBottom: 2 }}>카카오톡 연락처</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#3C1E1E' }}>
          {isUrl ? '오픈채팅 링크' : kakaoId}
        </div>
      </div>
      <button
        onClick={handleClick}
        style={{
          background: '#3C1E1E',
          color: '#FEE500',
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {copied ? '✓ 복사됨' : isUrl ? '카톡하기 →' : 'ID 복사'}
      </button>
    </div>
  );
}
