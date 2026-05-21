import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getServerUser } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerUser();
  const email = user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.has(email)) {
    redirect('/login?callbackUrl=/admin');
  }
  return <>{children}</>;
}
