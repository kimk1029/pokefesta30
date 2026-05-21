import { LoginRequired } from '@/components/LoginRequired';
import { MyScreen } from '@/components/screens/MyScreen';
import { getServerUser, serverFetch } from '@/lib/apiServer';
import type { LevelInfo } from '@/lib/level';
import type { InventorySnapshot } from '@/components/InventoryProvider';

interface SummaryResp {
  user: { id: string; name: string | null; email: string | null };
  inventory: InventorySnapshot;
  level: LevelInfo;
  counts: { tradeCount: number; savedCount: number; cardCount: number };
}

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getServerUser();
  if (!user?.id) {
    return (
      <LoginRequired
        title="마이페이지"
        message="내 활동 · 포인트 · 상점은 로그인 후 이용 가능합니다"
        callbackUrl="/my"
      />
    );
  }
  const r = await serverFetch<SummaryResp>('/api/me/summary');
  const s = r.data;
  if (!s) {
    return (
      <LoginRequired
        title="마이페이지"
        message="잠시 후 다시 시도해주세요"
        callbackUrl="/my"
      />
    );
  }
  return (
    <MyScreen
      user={s.user}
      level={s.level}
      cardCount={s.counts.cardCount}
      tradeCount={s.counts.tradeCount}
      savedCount={s.counts.savedCount}
    />
  );
}
