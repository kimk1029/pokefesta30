import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { fetchMvcArticle, type MvcCommentItem } from '@/lib/navercafe';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MVC 경매 상세 | 포케30',
};

function Comment({ c }: { c: MvcCommentItem }) {
  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: '1px dashed var(--line)',
        opacity: c.deleted ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
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
            작성자
          </span>
        )}
        <span style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginLeft: 'auto' }}>
          {c.writtenAgo}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
          <span>· 💬 {article.commentCount}</span>
        </div>
      </div>

      {/* 본문 텍스트 */}
      {article.contentText && (
        <div
          style={{
            margin: '14px var(--gap)',
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

      {/* 본문 이미지 */}
      {article.images.length > 0 && (
        <div style={{ margin: '0 var(--gap) 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {article.images.map((src) => (
            // 외부(네이버 카페) 이미지는 일반 <img> 사용
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              style={{ width: '100%', height: 'auto', display: 'block', border: '2px solid var(--line)' }}
            />
          ))}
        </div>
      )}

      {/* 댓글 (입찰) */}
      <div className="sect">
        <SectionTitle title={`댓글 ${article.comments.length}`} />
        <div style={{ margin: '0 var(--gap)' }}>
          {article.comments.length === 0 ? (
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
            article.comments.map((c) => <Comment key={c.id} c={c} />)
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
