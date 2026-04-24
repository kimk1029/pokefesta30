import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';

export const dynamic = 'force-dynamic';

interface Notice {
  id: string;
  date: string;
  title: string;
  tag?: 'update' | 'event' | 'maintenance';
  body: string;
}

// 임시 데이터 — 추후 어드민 CRUD 로 전환 가능
const NOTICES: Notice[] = [
  {
    id: 'n-2026-04-20',
    date: '2026.04.20',
    title: '포케페스타30 서비스 오픈',
    tag: 'event',
    body: '포케페스타30 웹 서비스가 정식 오픈했습니다. 현장 혼잡도 제보·거래·스탬프 랠리·오리파 모두 이용 가능합니다.',
  },
  {
    id: 'n-2026-04-15',
    date: '2026.04.15',
    title: '스탬프 6곳 주소 확정 안내',
    tag: 'update',
    body: '성수 일대 6개 포켓스탑 정식 주소가 확정되어 "실제 지도" 탭에 반영되었습니다. 각 지점 정보 참고하세요.',
  },
];

const TAG_STYLE: Record<NonNullable<Notice['tag']>, { bg: string; color: string; label: string }> = {
  update:      { bg: 'var(--grn)', color: 'var(--white)', label: 'UPDATE' },
  event:       { bg: 'var(--red)', color: 'var(--white)', label: 'EVENT' },
  maintenance: { bg: 'var(--ink)', color: 'var(--yel)',   label: '점검' },
};

export default function Page() {
  return (
    <>
      <StatusBar />
      <AppBar title="공지사항" showBack backHref="/my" />

      <div style={{ height: 14 }} />

      <div className="sect">
        <SectionTitle title="공지사항" right={<span className="more">{NOTICES.length}건</span>} />
        {NOTICES.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)' }}>
            등록된 공지가 없어요
          </div>
        ) : (
          NOTICES.map((n) => (
            <article
              key={n.id}
              style={{
                margin: '0 0 10px',
                padding: '12px 14px',
                background: 'var(--white)',
                boxShadow:
                  '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                {n.tag && (
                  <span
                    style={{
                      padding: '2px 7px',
                      background: TAG_STYLE[n.tag].bg,
                      color: TAG_STYLE[n.tag].color,
                      fontFamily: 'var(--f1)',
                      fontSize: 8,
                      letterSpacing: 0.5,
                      boxShadow:
                        '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
                    }}
                  >
                    {TAG_STYLE[n.tag].label}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 8,
                    color: 'var(--ink3)',
                    letterSpacing: 0.3,
                  }}
                >
                  {n.date}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: 0.5, marginBottom: 6 }}>
                {n.title}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f1)',
                  fontSize: 9,
                  color: 'var(--ink2)',
                  lineHeight: 1.8,
                  letterSpacing: 0.3,
                }}
              >
                {n.body}
              </div>
            </article>
          ))
        )}
      </div>

      <div className="bggap" />
    </>
  );
}
