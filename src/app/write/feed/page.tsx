import { getServerSession } from 'next-auth';
import { LoginRequired } from '@/components/LoginRequired';
import { WriteScreen } from '@/components/screens/WriteScreen';
import { authOptions } from '@/lib/auth';
import { findCardEntry } from '@/lib/cardsCatalog';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { cardId?: string; userCardId?: string };
}

export default async function Page({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <LoginRequired
        title="커뮤니티 글 작성"
        message="글 작성은 로그인 후 가능합니다"
        callbackUrl="/write/feed"
      />
    );
  }

  const prefill = await resolvePrefill(session.user.id, searchParams);
  return <WriteScreen mode="feed" prefill={prefill} />;
}

async function resolvePrefill(
  userId: string,
  sp: { cardId?: string; userCardId?: string },
): Promise<{ body: string } | undefined> {
  if (sp.userCardId) {
    const id = Number(sp.userCardId);
    if (!Number.isFinite(id)) return undefined;
    const row = await prisma.userCard.findUnique({ where: { id } }).catch(() => null);
    if (!row || row.userId !== userId) return undefined;
    const entry = row.cardId ? findCardEntry(row.cardId) : undefined;
    const name = row.nickname || entry?.name || '내 카드';
    const grade = row.gradeEstimate ? ` (${row.gradeEstimate})` : '';
    return { body: `${name}${grade} 자랑하러 왔어요 🃏\n` };
  }
  if (sp.cardId) {
    const entry = findCardEntry(sp.cardId);
    if (!entry) return undefined;
    return { body: `${entry.name} 관련 글\n` };
  }
  return undefined;
}
