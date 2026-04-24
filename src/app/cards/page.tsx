import Link from 'next/link';
import { CardPriceChart } from '@/components/CardPriceChart';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { getCardHistory, getOrRefreshCardPrice, type PriceCurrent, type HistoryPoint } from '@/lib/cardPrices';
import { CARDS_CATALOG, snkrdunkQueryFor, snkrdunkUrl, type CardGrade } from '@/lib/cardsCatalog';
import { isEbayConfigured } from '@/lib/ebay';

export const dynamic = 'force-dynamic';

const GRADE_BG: Record<CardGrade, string> = {
  S: 'var(--pur)', A: 'var(--blu)', B: 'var(--tel)', C: 'var(--grn-dk)',
};

function fmtMoney(n: number, currency: string): string {
  const rounded = n >= 100 ? Math.round(n) : Math.round(n * 100) / 100;
  const num = rounded.toLocaleString('en-US');
  if (currency === 'USD') return `$${num}`;
  if (currency === 'KRW') return `${num}₩`;
  return `${num} ${currency}`;
}

interface CardRow {
  id: string;
  name: string;
  emoji: string;
  grade: CardGrade;
  ebayQuery: string;
  snkrdunkQuery?: string;
  price: PriceCurrent | null;
  history: HistoryPoint[];
}

export default async function Page() {
  const rows: CardRow[] = await Promise.all(
    CARDS_CATALOG.map(async (c) => {
      const [price, history] = await Promise.all([
        getOrRefreshCardPrice(c.id, c.ebayQuery),
        getCardHistory(c.id, 30),
      ]);
      return { ...c, price, history };
    }),
  );

  const configured = isEbayConfigured();
  const totalSamples = rows.reduce((s, r) => s + (r.price?.sampleN ?? 0), 0);

  return (
    <>
      <StatusBar />
      <AppBar title="카드 시세" showBack backHref="/" />

      <div style={{ height: 14 }} />

      {!configured && (
        <div
          style={{
            margin: '0 var(--gap) var(--cg)',
            padding: '10px 12px',
            background: 'var(--yel)',
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--ink)',
            letterSpacing: 0.3,
            lineHeight: 1.7,
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
          }}
        >
          ⚠ eBay API 키가 설정되지 않았습니다.<br />
          <code style={{ fontSize: 8 }}>EBAY_CLIENT_ID / EBAY_CLIENT_SECRET</code> 를 .env 에 추가하고 재배포하세요.
          <br />
          설정 방법: <code style={{ fontSize: 8 }}>docs/ebay-setup.md</code>
        </div>
      )}

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
        <div style={{ fontSize: 32 }}>📊</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: 1, color: 'var(--yel)' }}>
            eBay 실시간 시세
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
            호가 샘플 총 {totalSamples.toLocaleString()}건 · 10분 캐시<br />
            Browse API 기준 · 체결가(sold) 아님
          </div>
        </div>
      </div>

      <div className="sect">
        <SectionTitle title="카드별 시세" right={<span className="more">{rows.length}종</span>} />
        {rows.map((c) => {
          const price = c.price;
          const avgText = price ? fmtMoney(price.avg, price.currency) : '—';
          const rangeText = price
            ? `${fmtMoney(price.low, price.currency)} ~ ${fmtMoney(price.high, price.currency)} · ${price.sampleN}건`
            : (configured ? '데이터 없음' : '미설정');
          const trendUp = c.history.length >= 2 && c.history[c.history.length - 1].avg >= c.history[0].avg;
          return (
            <div key={c.id} className="shop-card" style={{ cursor: 'default' }}>
              <div className="sh-icon" style={{ background: GRADE_BG[c.grade], color: 'var(--white)' }}>
                {c.emoji}
              </div>
              <div className="sh-main">
                <div className="sh-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: 'var(--f1)',
                      fontSize: 9,
                      padding: '2px 5px',
                      background: GRADE_BG[c.grade],
                      color: 'var(--white)',
                      letterSpacing: 0.5,
                      boxShadow:
                        '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
                    }}
                  >
                    {c.grade}
                  </span>
                  {c.name}
                </div>
                <div
                  className="sh-desc"
                  style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', marginTop: 6 }}
                >
                  {rangeText}
                </div>
                <div style={{ marginTop: 8 }}>
                  <CardPriceChart history={c.history} width={140} height={36} />
                </div>
                <div style={{ marginTop: 6 }}>
                  <Link
                    href={snkrdunkUrl(snkrdunkQueryFor(c))}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: 'var(--f1)',
                      fontSize: 8,
                      padding: '3px 8px',
                      background: 'var(--white)',
                      color: 'var(--ink2)',
                      letterSpacing: 0.3,
                      textDecoration: 'none',
                      boxShadow:
                        '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink),2px 2px 0 var(--ink)',
                    }}
                  >
                    🇯🇵 スニダン で見る →
                  </Link>
                </div>
              </div>
              <div className="sh-right">
                <span className="sh-price" style={{ color: trendUp ? 'var(--red)' : 'var(--blu)' }}>
                  {avgText}
                </span>
                {price && (
                  <span
                    style={{
                      fontFamily: 'var(--f1)',
                      fontSize: 8,
                      color: 'var(--ink3)',
                      letterSpacing: 0.3,
                    }}
                  >
                    med {fmtMoney(price.median, price.currency)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          margin: '8px var(--gap) 0',
          padding: '10px 12px',
          background: 'var(--pap2)',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink2)',
          lineHeight: 1.8,
          letterSpacing: 0.3,
          textAlign: 'center',
          boxShadow:
            '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
        }}
      >
        💡 차트는 10분 단위 스냅샷 누적으로 채워집니다.{' '}
        <Link href="/trade" style={{ color: 'var(--red)', textDecoration: 'underline' }}>
          거래 게시판 ▶
        </Link>
      </div>

      <div className="bggap" />
    </>
  );
}
