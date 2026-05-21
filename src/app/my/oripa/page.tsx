import { OripaScreen } from '@/components/screens/OripaScreen';
import { serverFetch } from '@/lib/apiServer';
import type { OripaBox } from '@/lib/types';

export const revalidate = 30;

export default async function Page() {
  const r = await serverFetch<{ data: OripaBox[] }>('/api/oripa', { auth: false });
  const boxes = r.data?.data ?? [];
  return <OripaScreen boxes={boxes} />;
}
