import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { MvcAuctionList } from '@/components/MvcAuctionList';
import { AuctionCountdown } from '@/components/AuctionCountdown';
import { fetchAllTodayAuctions, MVC_CAFE_URL } from '@/lib/navercafe';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MVC 경매 | 포케30',
};

export default async function Page() {
  // 오늘 마감 경매가 카페 목록 여러 페이지에 흩어져 있어 1페이지만 보면 일부 누락 →
  // 전부 모아 첫 화면부터 스크롤 없이 노출.
  const initial = await fetchAllTodayAuctions();

  return (
    <>
      <StatusBar />
      <AppBar title="MVC 경매" showBack backHref="/" />

      <div style={{ height: 14 }} />

      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: '14px 16px',
          background: 'linear-gradient(135deg,var(--ink),var(--ink2))',
          color: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow:
            '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 3px 0 var(--ink2),8px 8px 0 var(--yel-dk)',
        }}
      >
        <div style={{ fontSize: 32 }}>🔨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: 1, color: 'var(--yel)' }}>
            포켓몬카드 MVC 경매
          </div>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 9,
              letterSpacing: 0.3,
              color: 'rgba(255,255,255,.7)',
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            오늘 마감 경매만 · 23:00 종료 · 오늘 마감 글을 모두 모아 보여줘요<br />
            <a
              href={`https://cafe.naver.com/${MVC_CAFE_URL}`}
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: 'var(--yel)', textDecoration: 'underline' }}
            >
              네이버 카페 열기 →
            </a>
          </div>
        </div>
      </div>

      <div className="sect">
        <SectionTitle title="오늘 마감 경매" right={<AuctionCountdown />} />
        <MvcAuctionList initial={initial} />
      </div>

      <div style={{ height: 80 }} />
    </>
  );
}
