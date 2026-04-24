import Link from 'next/link';
import { OripaPackForm } from '@/components/OripaPackForm';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <Link href="/oripa/packs" className="btn">← 목록</Link>
      </div>
      <h1 className="admin-h1">신규 오리파</h1>
      <p className="admin-sub">새 팩 생성. 생성 후 바로 메인 앱 상점에 노출됩니다 (활성 체크 시).</p>
      <OripaPackForm mode="create" />
    </>
  );
}
