import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Suspense } from 'react';
import { LoginScreen } from '@/components/LoginScreen';
import { authOptions } from '@/lib/auth';

interface Props {
  searchParams?: { callbackUrl?: string };
}

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: Props) {
  const callbackUrl = searchParams?.callbackUrl ?? '/';
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect(callbackUrl);

  return (
    <Suspense fallback={null}>
      <LoginScreen callbackUrl={callbackUrl} hideSkip />
    </Suspense>
  );
}
