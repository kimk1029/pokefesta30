import Link from 'next/link';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { translate } from '@/lib/cardTranslate';
import { snkrdunkUrl } from '@/lib/cardsCatalog';
import { isEbayConfigured, searchEbayPrices, type EbayItemSummary } from '@/lib/ebay';

export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
}

function fmtMoney(n: number, currency: string): string {
  const rounded = n >= 100 ? Math.round(n) : Math.round(n * 100) / 100;
  const num = rounded.toLocaleString('en-US');
  if (currency === 'USD') return `$${num}`;
  if (currency === 'JPY') return `¥${num}`;
  if (currency === 'KRW') return `${num}₩`;
  return `${num} ${currency}`;
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q ?? '').trim();
  const jaQuery = q ? translate(q, 'ja') : '';
  const enQuery = q ? translate(q, 'en') : '';
  const configured = isEbayConfigured();

  const ebay = q && configured ? await searchEbayPrices(enQuery, { limit: 20 }) : null;

  return (
    <>
      <StatusBar />
      <AppBar title="카드 검색" showBack backHref="/cards" />

      <div style={{ height: 14 }} />

      {/* 검색 박스 */}
      <form
        method="get"
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: '14px 16px',
          background: 'var(--ink)',
          color: 'var(--white)',
          boxShadow:
            '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),8px 8px 0 var(--yel-dk)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--yel)',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          카드명 / 카드 코드 입력 (한·영 혼용 OK)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="예) 잉어킹 홀로, 리자몽, SV1-045"
            autoFocus
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'var(--white)',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--f1)',
              fontSize: 10,
              color: 'var(--ink)',
              letterSpacing: 0.3,
              boxShadow: 'inset 2px 2px 0 rgba(0,0,0,.1),inset -2px -2px 0 rgba(255,255,255,.8)',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0 16px',
              background: 'var(--red)',
              color: 'var(--white)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--f1)',
              fontSize: 10,
              letterSpacing: 1,
              boxShadow: 'inset 0 3px 0 var(--red-lt),inset 0 -3px 0 var(--red-dk)',
            }}
          >
            검색
          </button>
        </div>
      </form>

      {!q ? (
        <div style={{ margin: '0 var(--gap)', padding: 20, fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', textAlign: 'center', lineHeight: 1.7 }}>
          한국어로 입력하면 자동으로<br />
          🇯🇵 스니덩 용 일본어 / 🇺🇸 이베이 용 영어 로<br />
          각각 번역해서 결과를 보여드립니다.
        </div>
      ) : (
        <>
          {/* 번역 결과 표시 */}
          <div
            style={{
              margin: '0 var(--gap) var(--cg)',
              padding: '10px 14px',
              background: 'var(--pap2)',
              fontFamily: 'var(--f1)',
              fontSize: 8,
              color: 'var(--ink2)',
              letterSpacing: 0.3,
              lineHeight: 1.8,
              boxShadow:
                '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
            }}
          >
            입력: <b style={{ color: 'var(--ink)' }}>{q}</b>
            <br />
            🇯🇵 JA: <b style={{ color: 'var(--red)' }}>{jaQuery}</b>
            <br />
            🇺🇸 EN: <b style={{ color: 'var(--blu)' }}>{enQuery}</b>
          </div>

          {/* SNKRDUNK */}
          <div className="sect">
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--white)',
                fontFamily: 'var(--f1)',
                fontSize: 10,
                letterSpacing: 0.5,
                boxShadow:
                  '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
              }}
            >
              <div style={{ marginBottom: 8, color: 'var(--ink2)' }}>🇯🇵 스니덩 (SNKRDUNK)</div>
              <Link
                href={snkrdunkUrl(jaQuery)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '8px 14px',
                  background: 'var(--yel)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  letterSpacing: 0.5,
                  textDecoration: 'none',
                  boxShadow:
                    '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
                }}
              >
                スニダンで「{jaQuery}」を検索 →
              </Link>
              <div style={{ marginTop: 8, fontSize: 8, color: 'var(--ink3)' }}>
                ※ 공식 API 미제공 — 새 탭에서 SNKRDUNK 검색 페이지로 이동합니다.
              </div>
            </div>
          </div>

          {/* eBay 실시간 결과 */}
          <div className="sect">
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--white)',
                fontFamily: 'var(--f1)',
                fontSize: 10,
                letterSpacing: 0.5,
                boxShadow:
                  '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
              }}
            >
              <div style={{ marginBottom: 8, color: 'var(--ink2)' }}>
                🇺🇸 eBay {ebay ? `· ${ebay.sampleN.toLocaleString()}건 호가 샘플` : ''}
              </div>
              {!configured ? (
                <div style={{ fontSize: 8, color: 'var(--ink3)', lineHeight: 1.7 }}>
                  eBay API 키가 설정되어 있지 않습니다.
                  <br />
                  <code style={{ fontSize: 8 }}>EBAY_CLIENT_ID / EBAY_CLIENT_SECRET</code>
                </div>
              ) : !ebay ? (
                <div style={{ fontSize: 8, color: 'var(--ink3)' }}>
                  검색 결과가 없거나 API 호출이 실패했습니다.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 8, marginBottom: 10 }}>
                    <Badge>최저 {fmtMoney(ebay.low, ebay.currency)}</Badge>
                    <Badge emphasis>평균 {fmtMoney(ebay.avg, ebay.currency)}</Badge>
                    <Badge>중앙 {fmtMoney(ebay.median, ebay.currency)}</Badge>
                    <Badge>최고 {fmtMoney(ebay.high, ebay.currency)}</Badge>
                  </div>
                  <EbayList items={ebay.items} />
                </>
              )}
            </div>
          </div>
        </>
      )}

      <div className="bggap" />
    </>
  );
}

function Badge({ children, emphasis }: { children: React.ReactNode; emphasis?: boolean }) {
  return (
    <span
      style={{
        padding: '3px 8px',
        background: emphasis ? 'var(--red)' : 'var(--pap2)',
        color: emphasis ? 'var(--white)' : 'var(--ink)',
        fontFamily: 'var(--f1)',
        letterSpacing: 0.3,
        boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
      }}
    >
      {children}
    </span>
  );
}

function EbayList({ items }: { items: EbayItemSummary[] }) {
  if (items.length === 0) return <div style={{ fontSize: 8, color: 'var(--ink3)' }}>리스팅 없음</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((it) => (
        <Link
          key={it.itemId}
          href={it.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            background: 'var(--pap2)',
            textDecoration: 'none',
            boxShadow:
              '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
          }}
        >
          {it.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.thumb}
              alt=""
              width={40}
              height={40}
              style={{ objectFit: 'cover', background: 'var(--white)', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 40, height: 40, background: 'var(--white)', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--f1)',
                fontSize: 8,
                color: 'var(--ink)',
                letterSpacing: 0.2,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {it.title}
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 9,
              color: 'var(--red)',
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
            }}
          >
            {fmtMoney(it.price, it.currency)}
          </div>
        </Link>
      ))}
    </div>
  );
}
