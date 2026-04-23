'use client';


interface Props {
  kakaoId: string;
}

export function KakaoButton({ kakaoId }: Props) {
  const isOpenChat = kakaoId.startsWith('http');
  // profile.kakao.com/{id} → 모바일에서 카카오톡 앱으로 프로필 열림
  const profileUrl = isOpenChat ? kakaoId : `https://profile.kakao.com/${kakaoId}`;

  const handleClick = () => {
    window.open(profileUrl, '_blank');
  };

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { e.preventDefault(); handleClick(); }}
      style={{
        background: '#FEE500',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        textDecoration: 'none',
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: '#3C1E1E', opacity: 0.6, marginBottom: 2 }}>카카오톡 연락처</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#3C1E1E' }}>
          {isOpenChat ? '오픈채팅' : kakaoId}
        </div>
      </div>
      <div style={{
        background: '#3C1E1E',
        color: '#FEE500',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        카톡하기 →
      </div>
    </a>
  );
}
