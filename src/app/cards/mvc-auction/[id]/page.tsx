import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { fetchMvcArticle, type MvcArticleDetail, type MvcCommentItem } from '@/lib/navercafe';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MVC 경매 상세 | 포케30',
};

function fmtWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

/** 현재 최종호가 배너 — 가장 최근 댓글을 경매 현재가처럼 표시. */
function TopBidBanner({ article }: { article: MvcArticleDetail }) {
  const bid = article.latestBid;
  return (
    <div
      style={{
        margin: '14px var(--gap)',
        padding: '14px 16px',
        background: 'linear-gradient(135deg,#E63946,#B71C2C)',
        color: 'var(--white)',
        boxShadow:
          '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.2),6px 6px 0 var(--ink)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--f1)', fontSize: 10, letterSpacing: 1, color: 'var(--yel)' }}>
          🔨 현재 최종호가
        </span>
        <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.8)' }}>
          입찰 {article.commentCount}건
        </span>
      </div>
      {bid ? (
        <>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 26,
              letterSpacing: -1,
              marginTop: 8,
              textShadow: '3px 3px 0 rgba(0,0,0,.4)',
            }}
          >
            {bid.content ? bid.content : article.latestBidAmount != null ? fmtWon(article.latestBidAmount) : ''}
          </div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'rgba(255,255,255,.85)', marginTop: 6 }}>
            {bid.writerNickname || '익명'} · {bid.writtenAgo}
          </div>
        </>
      ) : (
        <div style={{ fontFamily: 'var(--f1)', fontSize: 14, marginTop: 10, color: 'rgba(255,255,255,.9)' }}>
          아직 입찰이 없습니다 — 첫 입찰을 노려보세요!
        </div>
      )}
    </div>
  );
}

function Comment({ c, isTop }: { c: MvcCommentItem; isTop: boolean }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        marginBottom: 8,
        background: isTop ? 'rgba(230,57,70,.06)' : 'var(--pap2)',
        boxShadow: isTop ? 'inset 0 0 0 2px var(--red)' : 'inset 0 0 0 1px var(--line)',
        opacity: c.deleted ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {isTop && (
          <span
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 8,
              padding: '1px 5px',
              background: 'var(--red)',
              color: 'var(--white)',
              letterSpacing: 0.5,
            }}
          >
            최종호가
          </span>
        )}
        <span style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink)' }}>
          {c.writerNickname || '익명'}
        </span>
        {c.byArticleWriter && (
          <span
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 8,
              padding: '1px 4px',
              background: 'var(--gold)',
              color: 'var(--ink)',
              letterSpacing: 0.5,
            }}
          >
            판매자
          </span>
        )}
        <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginLeft: 'auto' }}>
          {c.writtenAgo}
        </span>
      </div>
      <div
        style={{
          fontSize: isTop ? 16 : 14,
          fontWeight: isTop ? 700 : 400,
          color: isTop ? 'var(--red)' : 'var(--ink)',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {c.content}
      </div>
    </div>
  );
}

export default async function Page({ params }: { params: { id: string } }) {
  const articleId = Number(params.id);
  if (!Number.isInteger(articleId) || articleId <= 0) notFound();

  const article = await fetchMvcArticle(articleId);
  if (!article) {
    return (
      <>
        <StatusBar />
        <AppBar title="MVC 경매" showBack backHref="/cards/mvc-auction" />
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
          글을 불러오지 못했습니다.<br />
          삭제되었거나 일시적인 오류일 수 있어요.
        </div>
      </>
    );
  }

  // 입찰 내역은 최신순으로 표시 (맨 위가 최종호가).
  const bids = [...article.comments].reverse();
  const topBidId = article.latestBid?.id ?? null;

  return (
    <>
      <StatusBar />
      <AppBar title="MVC 경매" showBack backHref="/cards/mvc-auction" />

      <div style={{ padding: '14px var(--gap) 0' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4, margin: 0, color: 'var(--ink)', wordBreak: 'break-word' }}>
          {article.subject}
        </h1>
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
          <span>{article.writerNickname}</span>
          <span>· {article.writtenAgo}</span>
          <span>· 👁 {article.readCount}</span>
        </div>
      </div>

      {/* 현재 최종호가 */}
      <TopBidBanner article={article} />

      {/* 본문 이미지 (카드 사진) */}
      {article.images.length > 0 && (
        <div style={{ margin: '0 var(--gap) 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {article.images.map((src) => (
            // 외부(네이버 카페) 이미지는 일반 <img> 사용
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              // 네이버 이미지 CDN은 우리 도메인 referer를 403 차단 → referer 미전송
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: 'auto', display: 'block', border: '2px solid var(--line)' }}
            />
          ))}
        </div>
      )}

      {/* 본문 텍스트 (경매 조건) */}
      {article.contentText && (
        <div
          style={{
            margin: '0 var(--gap) 14px',
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
          {article.contentText}
        </div>
      )}

      {/* 입찰 내역 (댓글) */}
      <div className="sect">
        <SectionTitle title={`입찰 내역 ${bids.length}`} />
        <div style={{ margin: '0 var(--gap)' }}>
          {bids.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                fontFamily: 'var(--f1)',
                fontSize: 11,
                color: 'var(--ink3)',
              }}
            >
              아직 입찰(댓글)이 없습니다.
            </div>
          ) : (
            bids.map((c) => <Comment key={c.id} c={c} isTop={c.id === topBidId} />)
          )}
        </div>
      </div>

      <div style={{ margin: '0 var(--gap) 24px' }}>
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '12px',
            fontFamily: 'var(--f1)',
            fontSize: 11,
            letterSpacing: 0.5,
            background: 'var(--grn)',
            color: 'var(--white)',
            textDecoration: 'none',
            boxShadow:
              '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),4px 4px 0 var(--ink)',
          }}
        >
          네이버 카페에서 입찰하기 →
        </a>
      </div>

      <div style={{ height: 60 }} />
    </>
  );
}
