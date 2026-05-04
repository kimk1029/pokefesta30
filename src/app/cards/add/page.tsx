import Link from 'next/link';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '카드 추가 · CardVault',
  description: '카드 스캔 또는 직접 입력으로 컬렉션에 추가합니다.',
};

export default function Page() {
  return (
    <>
      <StatusBar />
      <AppBar title="카드 추가" showBack backHref="/my/cards" />
      <div style={{ height: 14 }} />

      <div className="cv-add-intro">
        어떻게 추가할까요?
        <div className="cv-add-intro-sub">스캔으로 자동 등록하거나 직접 입력해 보관할 수 있어요</div>
      </div>

      <div className="cv-add-grid">
        <Link href="/cards/grading" className="cv-add-card cv-add-scan">
          <div className="cv-add-emoji">📷</div>
          <div className="cv-add-title">스캔으로 추가</div>
          <div className="cv-add-desc">사진 한 장이면<br/>그레이딩까지 자동</div>
          <div className="cv-add-cta">▶ 카메라 열기</div>
        </Link>

        <Link href="/cards/add/manual" className="cv-add-card cv-add-manual">
          <div className="cv-add-emoji">✍️</div>
          <div className="cv-add-title">직접 입력</div>
          <div className="cv-add-desc">카드명·세트·메모를<br/>손으로 채워 넣기</div>
          <div className="cv-add-cta">▶ 입력 폼 열기</div>
        </Link>
      </div>

      <div className="cv-add-tip">
        💡 스캔 결과가 어색하다면 직접 입력으로 보완할 수 있어요
      </div>

      <div className="bggap" />
    </>
  );
}
