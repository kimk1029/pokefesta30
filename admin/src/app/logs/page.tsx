import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface SearchParams {
  uid?: string;
  page?: string;
}

// 활동 로그(PageView, IP·일별 집계)는 행동 로그(ActionLog, 모든 클릭/페이지이동 원시 로그)에
// 흡수 통합됨. 옛 링크/북마크 호환을 위해 /events 로 리다이렉트.
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const q = new URLSearchParams();
  if (searchParams.uid) q.set('uid', searchParams.uid.trim());
  if (searchParams.page) q.set('page', searchParams.page);
  const qs = q.toString();
  redirect(qs ? `/events?${qs}` : '/events');
}
