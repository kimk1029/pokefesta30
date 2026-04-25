import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookmarkButton } from '@/components/BookmarkButton';
import { BumpButton } from '@/components/BumpButton';
import { ComposedAvatar } from '@/components/ComposedAvatar';
import { KakaoButton } from '@/components/KakaoButton';
import { TradeStatusActions } from '@/components/TradeStatusActions';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { Tag } from '@/components/ui/Tag';
import { authOptions } from '@/lib/auth';
import { formatPrice } from '@/lib/numberFormat';
import { getTradeById } from '@/lib/queries';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const [trade, session] = await Promise.all([getTradeById(id), getServerSession(authOptions)]);
  if (!trade) notFound();

  const isAuthor = !!session?.user?.id && session.user.id === trade.authorId;

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
          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
            {STATUS_LABEL[trade.status] ?? trade.status}
          </span>
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{trade.title}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
          <ComposedAvatar
            avatar={trade.authorEmoji}
            bg={trade.authorBgId}
            frame={trade.authorFrameId}
            size={48}
            fallback={trade.authorEmoji}
          />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
              {trade.authorName ?? '-'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>{trade.time}</span>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>
            {formatPrice(trade.price)}
          </span>
          <BookmarkButton tradeId={trade.id} />
        </div>

        {/* 사진 갤러리 */}
        {trade.images && trade.images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6, paddingTop: 4 }}>
            {trade.images.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', aspectRatio: '1/1', overflow: 'hidden' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`상품 사진 ${i + 1}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    background: 'var(--pap2)',
                    boxShadow:
                      '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
                  }}
                />
              </a>
            ))}
          </div>
        )}

        {trade.body && (
          <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            {trade.body}
          </div>
        )}

        {!isAuthor && trade.authorId && (
          <Link
            href={`/my/messages/${trade.authorId}?trade=${trade.id}`}
            className="chat-cta"
            aria-label="1:1 쪽지 보내기"
          >
            ✉ 1:1 쪽지 보내기 ▶
          </Link>
        )}

        {trade.kakaoId && (
          <div style={{ marginTop: 8 }}>
            <KakaoButton kakaoId={trade.kakaoId} />
          </div>
        )}

        {isAuthor && (
          <>
            <div style={{ marginTop: 4 }}>
              <BumpButton tradeId={trade.id} initialCount={trade.bumpCount ?? 0} />
            </div>
            <TradeStatusActions
              tradeId={trade.id}
              status={trade.status}
              isAuthor={isAuthor}
            />
          </>
        )}
      </div>

      <div className="bggap" />
    </>
  );
}
