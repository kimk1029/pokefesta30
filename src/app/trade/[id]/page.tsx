import { notFound } from 'next/navigation';
import { BookmarkButton } from '@/components/BookmarkButton';
import { KakaoButton } from '@/components/KakaoButton';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { Tag } from '@/components/ui/Tag';
import { getTradeById } from '@/lib/queries';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const trade = await getTradeById(id);
  if (!trade) notFound();

  const STATUS_LABEL: Record<string, string> = {
    open: '거래 중',
    reserved: '예약 중',
    done: '거래 완료',
    cancelled: '취소됨',
  };

  return (
    <>
      <StatusBar />
      <AppBar title="거래글" showBack backHref="/trade" />

      <div style={{ padding: '16px var(--gap)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Tag variant={trade.type === 'buy' ? 'buy' : 'sell'}>
            {trade.type === 'buy' ? '삽니다' : '팝니다'}
          </Tag>
          <Tag variant="place">📍 {trade.place}</Tag>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
            {STATUS_LABEL[trade.status] ?? trade.status}
          </span>
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}>{trade.title}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          <span>{trade.authorEmoji}</span>
          <span>{trade.time}</span>
          <span>·</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{trade.price}</span>
          <div style={{ marginLeft: 'auto' }}>
            <BookmarkButton tradeId={trade.id} />
          </div>
        </div>

        {trade.body && (
          <div style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            {trade.body}
          </div>
        )}

        {trade.kakaoId && (
          <div style={{ marginTop: 8 }}>
            <KakaoButton kakaoId={trade.kakaoId} />
          </div>
        )}
      </div>

      <div className="bggap" />
    </>
  );
}
