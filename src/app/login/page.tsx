import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LoginScreen } from '@/components/LoginScreen';
import { getServerUser } from '@/lib/apiServer';

interface Props {
  searchParams?: { callbackUrl?: string };
}

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: Props) {
  const callbackUrl = searchParams?.callbackUrl ?? '/';
  const user = await getServerUser();
  if (user?.id) redirect(callbackUrl);

  return (
    <Suspense fallback={null}>
      <LoginScreen callbackUrl={callbackUrl} hideSkip />
    </Suspense>
  );
}
