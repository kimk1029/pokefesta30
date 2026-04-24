import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { fmtDate, trunc } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  const id = params.id;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, avatar: true, avatarId: true, backgroundId: true, frameId: true,
      rating: true, points: true,
      ownedAvatars: true, ownedBackgrounds: true, ownedFrames: true,
      createdAt: true, updatedAt: true,
      _count: {
        select: {
          feeds: true, trades: true, bookmarks: true,
          sentMessages: true, receivedMessages: true, oripaTickets: true,
        },
      },
    },
  });
  if (!user) notFound();

  const one = async <T,>(p: Promise<T>, fb: T): Promise<T> => {
    try { return await p; } catch (e) { console.error('[admin.user.detail]', e); return fb; }
  };

  const [feeds, trades, pulls, lastViews] = await Promise.all([
    one(
      prisma.feed.findMany({
        where: { authorId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, kind: true, text: true, createdAt: true },
      }),
      [] as Array<{ id: number; kind: string; text: string; createdAt: Date }>,
    ),
    one(
      prisma.trade.findMany({
        where: { authorId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, status: true, title: true, price: true, createdAt: true },
      }),
      [] as Array<{ id: number; type: string; status: string; title: string; price: string | null; createdAt: Date }>,
    ),
    one(
      prisma.oripaTicket.findMany({
        where: { drawnById: id },
        orderBy: { drawnAt: 'desc' },
        take: 10,
        select: { id: true, packId: true, index: true, grade: true, prizeName: true, drawnAt: true },
      }),
      [] as Array<{ id: number; packId: string; index: number; grade: string | null; prizeName: string | null; drawnAt: Date | null }>,
    ),
    one(
      prisma.pageView.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, path: true, ip: true, country: true, createdAt: true },
      }),
      [] as Array<{ id: number; path: string; ip: string | null; country: string | null; createdAt: Date }>,
    ),
  ]);

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <Link href="/users" className="btn">← 회원 목록</Link>
      </div>
      <h1 className="admin-h1">{user.name}</h1>
      <p className="admin-sub mono">{user.id}</p>

      <div className="grid-stats">
        <Stat label="포인트" value={user.points} />
        <Stat label="피드" value={user._count.feeds} />
        <Stat label="거래" value={user._count.trades} />
        <Stat label="찜" value={user._count.bookmarks} />
        <Stat label="쪽지(보냄/받음)" value={user._count.sentMessages + user._count.receivedMessages} />
        <Stat label="오리파 뽑기" value={user._count.oripaTickets} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 16, marginTop: 16 }}>
        <section className="card">
          <h2>프로필</h2>
          <table className="tbl">
            <tbody>
              <InfoRow label="이름" value={user.name} />
              <InfoRow label="아바타" value={`${user.avatar} / ${user.avatarId}`} />
              <InfoRow label="배경" value={user.backgroundId} />
              <InfoRow label="프레임" value={user.frameId} />
              <InfoRow label="평점" value={`${user.rating} / 5`} />
              <InfoRow label="가입" value={fmtDate(user.createdAt)} />
              <InfoRow label="마지막 업데이트" value={fmtDate(user.updatedAt)} />
              <InfoRow label="보유 아바타" value={user.ownedAvatars.join(', ') || '-'} />
              <InfoRow label="보유 배경" value={user.ownedBackgrounds.join(', ') || '-'} />
              <InfoRow label="보유 프레임" value={user.ownedFrames.join(', ') || '-'} />
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>최근 피드 (10)</h2>
          {feeds.length === 0 ? <div className="muted">없음</div> : (
            <table className="tbl">
              <thead><tr><th>#</th><th>종류</th><th>본문</th><th>시각</th></tr></thead>
              <tbody>
                {feeds.map((f) => (
                  <tr key={f.id}>
                    <td className="mono">{f.id}</td>
                    <td><span className={`tag ${f.kind === 'report' ? 'tag-report' : 'tag-general'}`}>{f.kind}</span></td>
                    <td>{trunc(f.text, 50)}</td>
                    <td className="mono muted">{fmtDate(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>최근 거래 (10)</h2>
          {trades.length === 0 ? <div className="muted">없음</div> : (
            <table className="tbl">
              <thead><tr><th>#</th><th>유형</th><th>상태</th><th>제목</th><th>가격</th><th>시각</th></tr></thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id}>
                    <td className="mono">{t.id}</td>
                    <td><span className="tag">{t.type}</span></td>
                    <td><span className={`tag ${t.status === 'done' ? 'tag-done' : 'tag-open'}`}>{t.status}</span></td>
                    <td>{trunc(t.title, 40)}</td>
                    <td className="mono">{t.price ?? '-'}</td>
                    <td className="mono muted">{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>최근 오리파 뽑기 (10)</h2>
          {pulls.length === 0 ? <div className="muted">없음</div> : (
            <table className="tbl">
              <thead><tr><th>팩</th><th>#</th><th>등급</th><th>상품</th><th>시각</th></tr></thead>
              <tbody>
                {pulls.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.packId}</td>
                    <td className="mono">{p.index}</td>
                    <td className="mono">{p.grade ?? '-'}</td>
                    <td>{p.prizeName ?? '-'}</td>
                    <td className="mono muted">{fmtDate(p.drawnAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>최근 방문 기록 (10)</h2>
          {lastViews.length === 0 ? <div className="muted">없음</div> : (
            <table className="tbl">
              <thead><tr><th>경로</th><th>IP</th><th>국가</th><th>시각</th></tr></thead>
              <tbody>
                {lastViews.map((v) => (
                  <tr key={v.id}>
                    <td className="mono">{v.path}</td>
                    <td className="mono">{v.ip ?? '-'}</td>
                    <td className="mono">{v.country ?? '-'}</td>
                    <td className="mono muted">{fmtDate(v.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ width: 140, color: '#64748B' }}>{label}</td>
      <td className="mono">{value}</td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="lbl">{label}</div>
      <div className="val">{value.toLocaleString()}</div>
    </div>
  );
}
