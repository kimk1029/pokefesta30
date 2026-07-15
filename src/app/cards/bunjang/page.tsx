import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { BunjangBrowser } from '@/components/BunjangBrowser';
import { fetchBunjangSearch, BUNJANG_DEFAULT_KEYWORD } from '@/lib/bunjang';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '국내 시세 (번개장터) | 아르보TCG',
};

export default async function Page() {
  const { items } = await fetchBunjangSearch(BUNJANG_DEFAULT_KEYWORD, 0, 40);

  return (
    <>
      <StatusBar />
      <AppBar title="국내 시세" showBack backHref="/" />

      <div style={{ height: 14 }} />

      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: '14px 16px',
          background: 'linear-gradient(135deg,#E63946,#B71C2C)',
          color: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow:
            '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.2),8px 8px 0 var(--ink)',
        }}
      >
        <div style={{ fontSize: 32 }}>🇰🇷</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: 1, color: 'var(--yel)' }}>
            번개장터 국내 시세
          </div>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 9,
              letterSpacing: 0.3,
              color: 'rgba(255,255,255,.85)',
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            국내 중고 거래가 · 검색해서 실시간 매물 확인<br />
            매물을 누르면 번개장터에서 바로 열려요
          </div>
        </div>
      </div>

      <BunjangBrowser initialItems={items} initialQuery={BUNJANG_DEFAULT_KEYWORD} />

      <div style={{ height: 80 }} />
    </>
  );
}
