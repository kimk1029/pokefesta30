import { VisitorChart } from '@/components/VisitorChart';
import { DeltaStat } from '@/components/DeltaStat';
import { HourlyChart } from '@/components/HourlyChart';
import { SignupSparkline } from '@/components/SignupSparkline';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

async function one<T>(p: Promise<T>, fb: T): Promise<T> {
  try { return await p; } catch (e) { console.error('[admin.dashboard]', e); return fb; }
}

async function loadStats() {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const start7d = new Date();
  start7d.setDate(start7d.getDate() - 6);
  start7d.setHours(0, 0, 0, 0);
  const start14d = new Date();
  start14d.setDate(start14d.getDate() - 13);
  start14d.setHours(0, 0, 0, 0);
  const yesterdayRange = { gte: startYesterday, lt: startToday };

  // 각 쿼리를 개별 try/catch — 하나 실패해도 나머지는 보여줌 (page_views/oripa_packs 테이블 미생성 시 graceful)
  const [
    users, feedsAll, feedsToday, trades, messagesAll, unread,
    viewsToday, uniqueIpsToday, uniqueUsersToday,
    topPaths, recentVisits, dailySeries,
    recentFeeds, recentUsers,
    signupsToday, signupsYesterday,
    visitorsYesterday, loginsYesterday, viewsYesterday,
    todayPageViews, signupRows,
  ] = await Promise.all([
    one(prisma.user.count(), 0),
    one(prisma.feed.count(), 0),
    one(prisma.feed.count({ where: { createdAt: { gte: startToday } } }), 0),
    one(prisma.trade.count(), 0),
    one(prisma.message.count(), 0),
    one(prisma.message.count({ where: { readAt: null } }), 0),
    one(prisma.pageView.count({ where: { createdAt: { gte: startToday } } }), 0),
    one(
      prisma.pageView.findMany({
        where: { createdAt: { gte: startToday }, ip: { not: null } },
        distinct: ['ip'],
        select: { ip: true },
      }).then((r) => r.length),
      0,
    ),
    one(
      prisma.pageView.findMany({
        where: { createdAt: { gte: startToday }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }).then((r) => r.length),
      0,
    ),
    one(
      (async () => {
        const rows = await prisma.pageView.groupBy({
          by: ['path'],
          where: { createdAt: { gte: startToday } },
          _count: { _all: true },
          orderBy: { _count: { path: 'desc' } },
          take: 10,
        });
        return rows as Array<{ path: string; _count: { _all: number } }>;
      })(),
      [] as Array<{ path: string; _count: { _all: number } }>,
    ),
    one(
      prisma.pageView.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, path: true, ip: true, country: true, userId: true, createdAt: true },
      }),
      [] as Array<{ id: number; path: string; ip: string | null; country: string | null; userId: string | null; createdAt: Date }>,
    ),
    one(
      // (ip, day) 유니크 테이블이므로 count(*) = 일별 고유 방문자
      prisma.$queryRaw<Array<{ day: Date; visitors: bigint; logins: bigint }>>`
        SELECT "day" AS day,
               count(*) AS visitors,
               count(DISTINCT "userId") FILTER (WHERE "userId" IS NOT NULL) AS logins
          FROM page_views
         WHERE "day" >= ${start14d}
         GROUP BY 1 ORDER BY 1 ASC
      `,
      [] as Array<{ day: Date; visitors: bigint; logins: bigint }>,
    ),
    one(
      prisma.feed.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, text: true, createdAt: true },
      }),
      [] as Array<{ id: number; text: string; createdAt: Date }>,
    ),
    one(
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, createdAt: true, points: true },
      }),
      [] as Array<{ id: string; name: string; createdAt: Date; points: number }>,
    ),
    // 오늘 / 어제 가입자
    one(prisma.user.count({ where: { createdAt: { gte: startToday } } }), 0),
    one(prisma.user.count({ where: { createdAt: yesterdayRange } }), 0),
    // 어제 접속 비교
    one(
      prisma.pageView.findMany({
        where: { createdAt: yesterdayRange, ip: { not: null } },
        distinct: ['ip'],
        select: { ip: true },
      }).then((r) => r.length),
      0,
    ),
    one(
      prisma.pageView.findMany({
        where: { createdAt: yesterdayRange, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }).then((r) => r.length),
      0,
    ),
    one(prisma.pageView.count({ where: { createdAt: yesterdayRange } }), 0),
    // 오늘 페이지뷰 원본 (시간대별 집계용)
    one(
      prisma.pageView.findMany({
        where: { createdAt: { gte: startToday } },
        select: { ip: true, userId: true, createdAt: true },
      }),
      [] as Array<{ ip: string | null; userId: string | null; createdAt: Date }>,
    ),
    // 최근 14일 가입 원본 (일별 집계용)
    one(
      prisma.user.findMany({
        where: { createdAt: { gte: start14d } },
        select: { createdAt: true },
      }),
      [] as Array<{ createdAt: Date }>,
    ),
  ]);

  return {
    ok: true as const,
    stats: { users, feedsAll, feedsToday, trades, messagesAll, unread,
      viewsToday, uniqueIpsToday, uniqueUsersToday,
      signupsToday, signupsYesterday, visitorsYesterday, loginsYesterday, viewsYesterday },
    topPaths, recentVisits, dailySeries, recentFeeds, recentUsers,
    hourly: buildHourly(todayPageViews),
    signups14: buildSignups14(signupRows),
  };
}

/** 오늘 페이지뷰를 로컬 시간대 24시간 버킷으로 — 시간대별 고유 IP/유저/PV. */
function buildHourly(rows: Array<{ ip: string | null; userId: string | null; createdAt: Date }>) {
  const ipSets = Array.from({ length: 24 }, () => new Set<string>());
  const userSets = Array.from({ length: 24 }, () => new Set<string>());
  const views = new Array(24).fill(0);
  for (const r of rows) {
    const h = new Date(r.createdAt).getHours();
    views[h] += 1;
    if (r.ip) ipSets[h].add(r.ip);
    if (r.userId) userSets[h].add(r.userId);
  }
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    visitors: ipSets[hour].size,
    logins: userSets[hour].size,
    views: views[hour],
  }));
}

/** 최근 14일 일별 가입자 — 빈 날은 0. */
function buildSignups14(rows: Array<{ createdAt: Date }>) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const out: Array<{ day: string; signups: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    out.push({ day: `${mm}-${dd}`, signups: map.get(key) ?? 0 });
  }
  return out;
}

export default async function Page() {
  const data = await loadStats();
  const { stats, topPaths, recentVisits, dailySeries, recentFeeds, recentUsers, hourly, signups14 } = data;

  // 14일 시리즈: DB 에 없는 날은 0 으로 채워 차트에 빈 칸 안 생기게
  const series14 = build14Days(dailySeries);

  return (
    <>
      <h1 className="admin-h1">대시보드</h1>
      <p className="admin-sub">오늘 가입·접속 현황 + 전체 운영 통계</p>

      <h2 style={{ fontSize: 14, color: '#475569', margin: '4px 0 10px', letterSpacing: 0.3 }}>🟢 오늘 현황 <span style={{ fontSize: 11, color: '#94A3B8' }}>(어제 대비)</span></h2>
      <div className="grid-stats">
        <DeltaStat label="오늘 가입자" value={stats.signupsToday} prev={stats.signupsYesterday} accent="#2563EB" sub="신규 회원" />
        <DeltaStat label="오늘 접속자" value={stats.uniqueIpsToday} prev={stats.visitorsYesterday} accent="#0EA5E9" sub="고유 IP" />
        <DeltaStat label="오늘 로그인" value={stats.uniqueUsersToday} prev={stats.loginsYesterday} accent="#10B981" sub="고유 유저" />
        <DeltaStat label="오늘 페이지뷰" value={stats.viewsToday} prev={stats.viewsYesterday} sub="전체 PV" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))', gap: 16, marginTop: 6 }}>
        <section className="card">
          <h2>⏰ 오늘 24시간 접속 분포</h2>
          <HourlyChart hours={hourly} />
        </section>
        <section className="card">
          <h2>🧑‍🤝‍🧑 최근 14일 가입자</h2>
          <SignupSparkline days={signups14} />
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>📈 최근 14일 방문자 · 로그인</h2>
        <VisitorChart points={series14} />
      </section>

      <h2 style={{ fontSize: 14, color: '#475569', margin: '20px 0 10px', letterSpacing: 0.3 }}>📊 서비스</h2>
      <div className="grid-stats">
        <Stat label="회원" value={stats.users} />
        <Stat label="전체 피드" value={stats.feedsAll} />
        <Stat label="오늘 피드" value={stats.feedsToday} />
        <Stat label="거래글" value={stats.trades} />
        <Stat label="쪽지" value={stats.messagesAll} sub={`미읽음 ${stats.unread}건`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 16, marginTop: 20 }}>
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
              <thead><tr><th>#</th><th>내용</th><th>시각</th></tr></thead>
              <tbody>
                {recentFeeds.map((f) => (
                  <tr key={f.id}>
                    <td className="mono">{f.id}</td>
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

function build14Days(rows: Array<{ day: Date; visitors: bigint; logins: bigint }>) {
  const map = new Map<string, { visitors: number; logins: number }>();
  for (const r of rows) {
    const key = r.day.toISOString().slice(0, 10);
    map.set(key, { visitors: Number(r.visitors), logins: Number(r.logins) });
  }
  const out: Array<{ day: string; visitors: number; logins: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const v = map.get(key) ?? { visitors: 0, logins: 0 };
    out.push({ day: `${mm}-${dd}`, visitors: v.visitors, logins: v.logins });
  }
  return out;
}
