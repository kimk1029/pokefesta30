import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LoginScreen } from '@/components/LoginScreen';
import { getServerUser } from '@/lib/apiServer';

interface Props {
  searchParams?: { callbackUrl?: string };
}

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: Props) {
  // 외부 URL 로의 오픈 리다이렉트 방지 — 같은 오리진 경로만 허용
  const raw = searchParams?.callbackUrl ?? '/';
  const callbackUrl = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  const user = await getServerUser();
  if (user?.id) redirect(callbackUrl);

  return (
    <Suspense fallback={null}>
      <LoginScreen callbackUrl={callbackUrl} hideSkip />
    </Suspense>
  );
}
