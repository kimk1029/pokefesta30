import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

async function loadStats() {
  try {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const start7d = new Date();
    start7d.setDate(start7d.getDate() - 6);
    start7d.setHours(0, 0, 0, 0);

    const [
      users, feedsAll, feedsToday, reportsAll, trades, messagesAll, unread,
      viewsToday,
      uniqueIpsToday,
      uniqueUsersToday,
      topPaths,
      recentVisits,
      dailySeries,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.feed.count(),
      prisma.feed.count({ where: { createdAt: { gte: startToday } } }),
      prisma.feed.count({ where: { kind: 'report' } }),
      prisma.trade.count(),
      prisma.message.count(),
      prisma.message.count({ where: { readAt: null } }),
      prisma.pageView.count({ where: { createdAt: { gte: startToday } } }),
      prisma.pageView.findMany({
        where: { createdAt: { gte: startToday }, ip: { not: null } },
        distinct: ['ip'],
        select: { ip: true },
      }).then((r) => r.length),
      prisma.pageView.findMany({
        where: { createdAt: { gte: startToday }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }).then((r) => r.length),
      prisma.pageView.groupBy({
        by: ['path'],
        where: { createdAt: { gte: startToday } },
        _count: { _all: true },
        orderBy: { _count: { path: 'desc' } },
        take: 10,
      }),
      prisma.pageView.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, path: true, ip: true, country: true, userId: true, createdAt: true },
      }),
      prisma.$queryRaw<Array<{ day: Date; views: bigint; uniq: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day,
               count(*) AS views,
               count(DISTINCT "ip") AS uniq
          FROM page_views
         WHERE "createdAt" >= ${start7d}
         GROUP BY 1 ORDER BY 1 ASC
      `.catch(() => []),
    ]);

    const recentFeeds = await prisma.feed.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, kind: true, text: true, createdAt: true },
    });
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, createdAt: true, points: true },
    });

    return {
      ok: true as const,
      stats: { users, feedsAll, feedsToday, reportsAll, trades, messagesAll, unread,
        viewsToday, uniqueIpsToday, uniqueUsersToday },
      topPaths, recentVisits, dailySeries, recentFeeds, recentUsers,
    };
  } catch (err) {
    console.error('[admin.dashboard]', err);
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

export default async function Page() {
  const data = await loadStats();

  if (!data.ok) {
    return (
      <>
        <h1 className="admin-h1">대시보드</h1>
        <p className="admin-sub">DB 연결 실패 — 환경변수(<code>DATABASE_URL</code>) 확인 필요.</p>
        <div className="card">
          <h2>오류</h2>
          <pre style={{ fontSize: 12, color: '#B91C1C', whiteSpace: 'pre-wrap' }}>{data.error}</pre>
        </div>
      </>
    );
  }

  const { stats, topPaths, recentVisits, dailySeries, recentFeeds, recentUsers } = data;

  return (
    <>
      <h1 className="admin-h1">대시보드</h1>
      <p className="admin-sub">전체 운영 현황 + 오늘 방문자 통계</p>

      <h2 style={{ fontSize: 14, color: '#475569', margin: '4px 0 10px', letterSpacing: 0.3 }}>🌐 오늘 방문</h2>
      <div className="grid-stats">
        <Stat label="오늘 페이지뷰" value={stats.viewsToday} />
        <Stat label="오늘 고유 IP" value={stats.uniqueIpsToday} />
        <Stat label="오늘 로그인 방문" value={stats.uniqueUsersToday} sub="고유 유저" />
      </div>

      <h2 style={{ fontSize: 14, color: '#475569', margin: '20px 0 10px', letterSpacing: 0.3 }}>📊 서비스</h2>
      <div className="grid-stats">
        <Stat label="회원" value={stats.users} />
        <Stat label="전체 피드" value={stats.feedsAll} sub={`제보 ${stats.reportsAll}건`} />
        <Stat label="오늘 피드" value={stats.feedsToday} />
        <Stat label="거래글" value={stats.trades} />
        <Stat label="쪽지" value={stats.messagesAll} sub={`미읽음 ${stats.unread}건`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 16, marginTop: 20 }}>
        <section className="card">
          <h2>최근 7일 방문 추이</h2>
          {dailySeries.length === 0 ? (
            <div className="muted">데이터 없음</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>일자</th><th>PV</th><th>고유 IP</th></tr></thead>
              <tbody>
                {dailySeries.map((d) => (
                  <tr key={d.day.toISOString()}>
                    <td className="mono">{d.day.toISOString().slice(0, 10)}</td>
                    <td className="mono">{Number(d.views).toLocaleString()}</td>
                    <td className="mono">{Number(d.uniq).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>오늘 상위 경로 (Top 10)</h2>
          {topPaths.length === 0 ? (
            <div className="muted">방문 없음</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>경로</th><th style={{ textAlign: 'right' }}>PV</th></tr></thead>
              <tbody>
                {topPaths.map((p) => (
                  <tr key={p.path}>
                    <td className="mono">{p.path}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{p._count._all.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>최근 방문 (20)</h2>
          {recentVisits.length === 0 ? (
            <div className="muted">방문 없음</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>경로</th><th>IP</th><th>국가</th><th>시각</th></tr></thead>
              <tbody>
                {recentVisits.map((v) => (
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

      <h2 style={{ fontSize: 14, color: '#475569', margin: '24px 0 10px', letterSpacing: 0.3 }}>🕘 최근 활동</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 16 }}>
        <section className="card">
          <h2>최근 피드 (5)</h2>
          {recentFeeds.length === 0 ? (
            <div className="muted">없음</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>#</th><th>종류</th><th>내용</th><th>시각</th></tr></thead>
              <tbody>
                {recentFeeds.map((f) => (
                  <tr key={f.id}>
                    <td className="mono">{f.id}</td>
                    <td>
                      <span className={`tag ${f.kind === 'report' ? 'tag-report' : 'tag-general'}`}>{f.kind}</span>
                    </td>
                    <td>{f.text.length > 40 ? f.text.slice(0, 40) + '…' : f.text}</td>
                    <td className="mono muted">{fmtDate(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>최근 가입 회원 (5)</h2>
          {recentUsers.length === 0 ? (
            <div className="muted">없음</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>이름</th><th>포인트</th><th>가입</th></tr></thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="mono">{u.points.toLocaleString()}</td>
                    <td className="mono muted">{fmtDate(u.createdAt)}</td>
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

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="lbl">{label}</div>
      <div className="val">{value.toLocaleString()}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
