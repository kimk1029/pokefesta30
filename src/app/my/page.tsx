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

const GUEST_LEVEL: LevelInfo = {
  level: 1,
  xp: 0,
  xpNeeded: 100,
  title: '신규',
} as LevelInfo;

export default async function Page() {
  const user = await getServerUser();
  // 미로그인 — LoginRequired 로 페이지 전체 가리지 않고 MyScreen 자체를 게스트
  // 모드로 보여줘 PortfolioTotal 의 자체 오버레이가 보이게.
  if (!user?.id) {
    return (
      <MyScreen
        user={{ name: null, email: null }}
        level={GUEST_LEVEL}
        cardCount={0}
        tradeCount={0}
        savedCount={0}
        isGuest
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
