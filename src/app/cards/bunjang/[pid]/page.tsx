import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { fetchBunjangProduct } from '@/lib/bunjang';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '우리 장터 시세 | 포케30',
};

function fmtWon(n: number): string {
  if (!n || n <= 0) return '가격문의';
  return `${n.toLocaleString('ko-KR')}원`;
}

function fmtUpdated(ms: number): string {
  if (!ms) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

export default async function Page({ params }: { params: { pid: string } }) {
  const product = await fetchBunjangProduct(params.pid);
  if (!product) {
    return (
      <>
        <StatusBar />
        <AppBar title="우리 장터 시세" showBack backHref="/cards/bunjang" />
        <div
          style={{
            margin: '40px var(--gap)',
            textAlign: 'center',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            color: 'var(--ink3)',
            lineHeight: 1.8,
          }}
        >
          상품을 불러오지 못했습니다.<br />
          판매 종료됐거나 일시적인 오류일 수 있어요.
        </div>
      </>
    );
  }

  const sold = product.saleStatusText === '판매완료';

  return (
    <>
      <StatusBar />
      <AppBar title="우리 장터 시세" showBack backHref="/cards/bunjang" />

      {/* 이미지 */}
      {product.images.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            margin: '14px var(--gap) 0',
          }}
        >
          {product.images.map((src) => (
            // 외부(번개장터) 이미지
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={product.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: '100%',
                height: 'auto',
                border: '2px solid var(--line)',
              }}
            />
          ))}
        </div>
      )}

      {/* 제목·시세 */}
      <div style={{ padding: '16px var(--gap) 0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          {product.saleStatusText && (
            <span
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 9,
                padding: '2px 6px',
                background: sold ? 'var(--ink3)' : 'var(--grn)',
                color: 'var(--white)',
                letterSpacing: 0.5,
              }}
            >
              {product.saleStatusText}
            </span>
          )}
          {product.conditionText && (
            <span
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 9,
                padding: '2px 6px',
                background: 'var(--pap2)',
                color: 'var(--ink)',
                letterSpacing: 0.5,
                boxShadow: 'inset 0 0 0 1px var(--line)',
              }}
            >
              {product.conditionText}
            </span>
          )}
        </div>

        <h1 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4, margin: 0, color: 'var(--ink)', wordBreak: 'break-word' }}>
          {product.name}
        </h1>

        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 24,
            color: 'var(--red)',
            letterSpacing: -0.5,
            marginTop: 12,
          }}
        >
          {fmtWon(product.price)}
        </div>

        {/* 메타 */}
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink3)',
            marginTop: 10,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>❤ 찜 {product.favCount}</span>
          <span>👁 조회 {product.viewCount}</span>
          <span>💬 {product.commentCount}</span>
          <span>{product.freeShipping ? '무료배송' : product.shippingFee > 0 ? `배송비 ${product.shippingFee.toLocaleString('ko-KR')}원` : ''}</span>
        </div>
        <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginTop: 6 }}>
          {product.shopName && `${product.shopName} · `}
          {product.category && `${product.category} · `}
          {product.updatedAt > 0 && `${fmtUpdated(product.updatedAt)} 갱신`}
        </div>
      </div>

      {/* 설명 */}
      {product.description && (
        <div
          style={{
            margin: '16px var(--gap)',
            padding: '14px 16px',
            background: 'var(--pap2)',
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--ink)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            boxShadow: 'inset 0 0 0 2px var(--line)',
          }}
        >
          {product.description}
        </div>
      )}

      {/* 번개장터로 이동 */}
      <div style={{ margin: '0 var(--gap) 24px' }}>
        <a
          href={product.productUrl}
          target="_blank"
          rel="noreferrer noopener"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '13px',
            fontFamily: 'var(--f1)',
            fontSize: 12,
            letterSpacing: 0.5,
            background: 'var(--red)',
            color: 'var(--white)',
            textDecoration: 'none',
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),4px 4px 0 var(--ink)',
          }}
        >
          번개장터에서 구매하기 →
        </a>
      </div>

      <div style={{ height: 60 }} />
    </>
  );
}
