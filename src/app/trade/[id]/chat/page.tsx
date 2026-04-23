import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { LoginRequired } from '@/components/LoginRequired';
import { TradeChatScreen } from '@/components/screens/TradeChatScreen';
import { authOptions } from '@/lib/auth';
import { getTradeById } from '@/lib/queries';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const [trade, session] = await Promise.all([
    getTradeById(id),
    getServerSession(authOptions),
  ]);
  if (!trade) notFound();
  if (!session?.user) {
    return (
      <LoginRequired
        title="1:1 문의"
        message="거래 문의는 로그인 후 가능합니다"
        callbackUrl={`/trade/${id}/chat`}
      />
    );
  }

  return <TradeChatScreen trade={trade} />;
}
