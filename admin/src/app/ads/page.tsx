import { AdImpressionChart } from '@/components/AdImpressionChart';
import { prisma } from '@/lib/prisma';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

async function safe<T>(p: Promise<T>, fb: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error('[admin.ads]', e);
    return fb;
  }
}

interface DailyRow {
  day: Date;
  network: string;
  count: bigint;
}

interface SlotRow {
  network: string;
  slotId: string;
  count: bigint;
}

interface RewardRow {
  slotId: string;
  views: bigint;
  payout: bigint;
}

export default async function Page() {
  const startToday = new Date();
  startToday.setUTCHours(0, 0, 0, 0);
  const start7d = new Date(startToday);
  start7d.setUTCDate(start7d.getUTCDate() - 6);
  const start14d = new Date(startToday);
  start14d.setUTCDate(start14d.getUTCDate() - 13);

  const [
    impTodayByNetwork,
    impTotalByNetwork,
    rewardTodayTotal,
    rewardTodayPayout,
    rewardTotalPayout,
    daily14d,
    topSlots,
    rewardSlots,
    recentRewards,
  ] = await Promise.all([
    safe(
      prisma.adEvent.groupBy({
        by: ['network'],
        where: { kind: 'impression', day: startToday },
        _count: { _all: true },
        orderBy: { network: 'asc' },
      }) as unknown as Promise<Array<{ network: string; _count: { _all: number } }>>,
      [],
    ),
    safe(
      prisma.adEvent.groupBy({
        by: ['network'],
        where: { kind: 'impression' },
        _count: { _all: true },
        orderBy: { network: 'asc' },
      }) as unknown as Promise<Array<{ network: string; _count: { _all: number } }>>,
      [],
    ),
    safe(
      prisma.adEvent.count({ where: { kind: 'reward', day: startToday } }),
      0,
    ),
    safe(
      prisma.adEvent.aggregate({
        where: { kind: 'reward', day: startToday },
        _sum: { reward: true },
      }).then((r) => r._sum.reward ?? 0),
      0,
    ),
    safe(
      prisma.adEvent.aggregate({
        where: { kind: 'reward' },
        _sum: { reward: true },
      }).then((r) => r._sum.reward ?? 0),
      0,
    ),
    safe(
      prisma.$queryRaw<DailyRow[]>`
        SELECT "day", "network", count(*) AS count
          FROM ad_events
         WHERE kind = 'impression' AND "day" >= ${start14d}
         GROUP BY 1, 2 ORDER BY 1 ASC
      `,
      [] as DailyRow[],
    ),
    safe(
      prisma.$queryRaw<SlotRow[]>`
        SELECT "network", "slotId", count(*) AS count
          FROM ad_events
         WHERE kind = 'impression' AND "day" >= ${start7d}
         GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 12
      `,
      [] as SlotRow[],
    ),
    safe(
      prisma.$queryRaw<RewardRow[]>`
        SELECT "slotId",
               count(*) AS views,
               COALESCE(sum(reward), 0) AS payout
          FROM ad_events
         WHERE kind = 'reward' AND "day" >= ${start7d}
         GROUP BY 1 ORDER BY 2 DESC
      `,
      [] as RewardRow[],
    ),
    safe(
      prisma.adEvent.findMany({
        where: { kind: 'reward' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          slotId: true,
          reward: true,
          userId: true,
          createdAt: true,
        },
      }),
      [] as Array<{
        id: number;
        slotId: string;
        reward: number;
        userId: string | null;
        createdAt: Date;
      }>,
    ),
  ]);

  // 차트 포인트 — 14일 일자 채워서 0 처리
  const chartPoints = buildChartPoints(daily14d, start14d);

  const todayBy = (n: string) =>
    impTodayByNetwork.find((r) => r.network === n)?._count._all ?? 0;
  const totalBy = (n: string) =>
    impTotalByNetwork.find((r) => r.network === n)?._count._all ?? 0;

  return (
    <div>
      <h1 className="admin-h1">📢 광고 분석</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, fontSize: 12 }}>
        자체 측정: 노출수 + 무료충전 보상. 클릭/수익은 광고사 콘솔에서 확인.
      </p>

      {/* 오늘 KPI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Stat label="오늘 AdSense 노출" value={todayBy('adsense')} hint={`누적 ${totalBy('adsense').toLocaleString()}`} />
        <Stat label="오늘 AdFit 노출" value={todayBy('adfit')} hint={`누적 ${totalBy('adfit').toLocaleString()}`} />
        <Stat label="오늘 무료충전 시청" value={Number(rewardTodayTotal)} />
        <Stat
          label="오늘 무료충전 지급액"
          value={`${Number(rewardTodayPayout).toLocaleString()} P`}
          hint={`누적 ${Number(rewardTotalPayout).toLocaleString()} P`}
        />
      </div>

      {/* 14일 차트 */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 14 }}>최근 14일 노출 추이</h2>
        <AdImpressionChart points={chartPoints} />
      </section>

      {/* 외부 콘솔 딥링크 */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 14 }}>광고사 콘솔 (클릭/수익 확인)</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ExtLink href="https://www.google.com/adsense/" label="AdSense 보고서" desc="클릭, RPM, 수익" />
          <ExtLink href="https://adfit.kakao.com/" label="Kakao AdFit 보고서" desc="노출, 클릭, eCPM, 수익" />
          <ExtLink href="https://analytics.google.com" label="Google Analytics" desc="페이지뷰, 사용자" />
        </div>
      </section>

      {/* 슬롯 분포 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        <section className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: 14 }}>최근 7일 슬롯별 노출 TOP12</h2>
          {topSlots.length === 0 ? (
            <div className="muted" style={{ padding: 12 }}>아직 데이터 없음</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>네트워크</th>
                  <th>슬롯 ID</th>
                  <th style={{ textAlign: 'right' }}>노출</th>
                </tr>
              </thead>
              <tbody>
                {topSlots.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <Badge net={r.network} />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.slotId}</td>
                    <td style={{ textAlign: 'right' }}>{Number(r.count).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: 14 }}>최근 7일 무료충전 슬롯별 통계</h2>
          {rewardSlots.length === 0 ? (
            <div className="muted" style={{ padding: 12 }}>아직 데이터 없음</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>슬롯</th>
                  <th style={{ textAlign: 'right' }}>시청</th>
                  <th style={{ textAlign: 'right' }}>지급액</th>
                </tr>
              </thead>
              <tbody>
                {rewardSlots.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.slotId}</td>
                    <td style={{ textAlign: 'right' }}>{Number(r.views).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{Number(r.payout).toLocaleString()} P</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* 최근 보상 지급 로그 */}
      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 14 }}>최근 무료충전 지급 로그</h2>
        {recentRewards.length === 0 ? (
          <div className="muted" style={{ padding: 12 }}>아직 데이터 없음</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>시각</th>
                <th>슬롯</th>
                <th>유저</th>
                <th style={{ textAlign: 'right' }}>지급</th>
              </tr>
            </thead>
            <tbody>
              {recentRewards.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.slotId}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {r.userId ? r.userId.slice(0, 12) + '…' : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>+{r.reward.toLocaleString()} P</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

/* ───────────────────── helpers ───────────────────── */

function buildChartPoints(rows: DailyRow[], start: Date) {
  const map = new Map<string, { adsense: number; adfit: number; house: number }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    map.set(toKey(d), { adsense: 0, adfit: 0, house: 0 });
  }
  for (const r of rows) {
    const k = toKey(new Date(r.day));
    const slot = map.get(k);
    if (!slot) continue;
    if (r.network === 'adsense') slot.adsense += Number(r.count);
    else if (r.network === 'adfit') slot.adfit += Number(r.count);
    else slot.house += Number(r.count);
  }
  return Array.from(map.entries()).map(([key, v]) => ({
    day: key.slice(5).replace('-', '/'),
    ...v,
  }));
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="stat-card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {hint && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function Badge({ net }: { net: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    adsense: { bg: '#DBEAFE', fg: '#1E40AF', label: 'AdSense' },
    adfit: { bg: '#FEF3C7', fg: '#92400E', label: 'AdFit' },
    house: { bg: '#EDE9FE', fg: '#5B21B6', label: 'House' },
    offerwall: { bg: '#D1FAE5', fg: '#065F46', label: 'Offerwall' },
  };
  const m = map[net] ?? { bg: '#E5E7EB', fg: '#374151', label: net };
  return (
    <span
      style={{
        background: m.bg,
        color: m.fg,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {m.label}
    </span>
  );
}

function ExtLink({
  href,
  label,
  desc,
}: {
  href: string;
  label: string;
  desc: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        flex: '1 1 200px',
        padding: 12,
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        textDecoration: 'none',
        color: '#0F172A',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label} ↗</div>
      <div style={{ fontSize: 11, color: '#64748B' }}>{desc}</div>
    </a>
  );
}
