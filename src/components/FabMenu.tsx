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
          className="fab-menu-btn fmb-report"
          onClick={() => go('/report')}
        >
          <div className="fmb-icon">📢</div>
          <div className="fmb-txt">
            <div>제보하기</div>
            <div className="fmb-sub">혼잡도 · 현장 상황 제보 → 현황 반영</div>
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
        <button
          type="button"
          className="fab-menu-btn fmb-feed"
          onClick={() => go('/write/feed')}
        >
          <div className="fmb-icon">🗣</div>
          <div className="fmb-txt">
            <div>피드 올리기</div>
            <div className="fmb-sub">현장 잡담 · 팁 · 분위기 공유</div>
          </div>
        </button>
        <button type="button" className="fab-close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
    </div>
  );
}
