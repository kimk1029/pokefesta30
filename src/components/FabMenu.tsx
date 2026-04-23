'use client';

import { useRouter } from 'next/navigation';

interface Props {
  onClose: () => void;
}

export function FabMenu({ onClose }: Props) {
  const router = useRouter();

  const go = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div className="fab-overlay" onClick={onClose}>
      <div className="fab-menu" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="fab-menu-btn fmb-feed"
          onClick={() => go('/write/feed')}
        >
          <div className="fmb-icon">🗣</div>
          <div className="fmb-txt">
            <div>피드 · 제보 작성</div>
            <div className="fmb-sub">일반 잡담 / 혼잡도 제보를 한 곳에서</div>
          </div>
        </button>
        <button
          type="button"
          className="fab-menu-btn fmb-trade"
          onClick={() => go('/write/trade')}
        >
          <div className="fmb-icon">💬</div>
          <div className="fmb-txt">
            <div>거래글 작성</div>
            <div className="fmb-sub">삽니다 / 팝니다 · 장소 태그 필수</div>
          </div>
        </button>
        <button type="button" className="fab-close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
    </div>
  );
}
