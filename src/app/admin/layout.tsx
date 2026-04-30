import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();
  if (!session) {
    redirect('/login?callbackUrl=/admin');
  }
  return <>{children}</>;
}
