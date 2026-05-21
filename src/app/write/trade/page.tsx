import { LoginRequired } from '@/components/LoginRequired';
import { WriteScreen } from '@/components/screens/WriteScreen';
import { getServerUser, serverFetch } from '@/lib/apiServer';
import { findCardEntry } from '@/lib/cardsCatalog';
import type { Place } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { cardId?: string; userCardId?: string };
}

interface UserCardRow {
  id: number;
  userId: string;
  cardId: string | null;
  nickname: string | null;
  gradeEstimate: string | null;
  memo: string | null;
}

export default async function Page({ searchParams }: Props) {
  const user = await getServerUser();
  if (!user?.id) {
    return (
      <LoginRequired
        title="거래글 작성"
        message="거래글 작성은 로그인 후 가능합니다"
        callbackUrl="/write/trade"
      />
    );
  }

  const placesResp = await serverFetch<{ data: Place[] }>('/api/places', { auth: false });
  const places = placesResp.data?.data ?? [];
  const prefill = await resolvePrefill(searchParams);

  return <WriteScreen mode="trade" places={places} prefill={prefill} />;
}

async function resolvePrefill(
  sp: { cardId?: string; userCardId?: string },
): Promise<{ title: string; body: string } | undefined> {
  if (sp.userCardId) {
    const id = Number(sp.userCardId);
    if (!Number.isFinite(id)) return undefined;
    const r = await serverFetch<{ data: UserCardRow }>(`/api/me/cards/${id}`);
    const row = r.data?.data;
    if (!row) return undefined;
    const entry = row.cardId ? findCardEntry(row.cardId) : undefined;
    const name = row.nickname || entry?.name || '내 카드';
    const grade = row.gradeEstimate ? ` · ${row.gradeEstimate}` : '';
    return {
      title: `[판매] ${name}${grade}`,
      body: row.memo || '',
    };
  }
  if (sp.cardId) {
    const entry = findCardEntry(sp.cardId);
    if (!entry) return undefined;
    return { title: `[판매] ${entry.name}`, body: '' };
  }
  return undefined;
}
