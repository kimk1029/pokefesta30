import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { Panel } from '@/components/ui/Panel';
import { serverFetch } from '@/lib/apiServer';
import {
  EVENT_STATUS_LABEL,
  eventPeriodLabel,
  eventStatus,
  type EventPost,
  type EventStatus,
} from '@/lib/events';

export const dynamic = 'force-dynamic';

export const metadata = { title: '이벤트 | 포케30' };

const STATUS_STYLE: Record<EventStatus, { background: string; color: string }> = {
  ongoing: { background: 'var(--accent)', color: '#fff' },
  upcoming: { background: 'var(--pap2)', color: 'var(--ink)' },
  always: { background: 'var(--pap2)', color: 'var(--ink)' },
  ended: { background: 'var(--pap2)', color: 'var(--ink3)' },
};

export default async function Page() {
  const r = await serverFetch<{ data: EventPost[] }>('/api/events', {
    auth: false,
    revalidate: 60,
  });
  const posts = r.data?.data ?? [];

  return (
    <>
      <StatusBar />
      <AppBar title="이벤트" showBack backHref="/" />

      <div style={{ padding: '16px var(--gap)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {posts.length === 0 ? (
          <Panel style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            진행 중인 이벤트가 없어요
          </Panel>
        ) : (
          posts.map((p) => {
            const status = eventStatus(p);
            const ended = status === 'ended';
            return (
              <Panel
                key={p.id}
                href={`/events/${p.id}`}
                style={{ padding: 0, overflow: 'hidden', opacity: ended ? 0.65 : 1 }}
                ariaLabel={p.title}
              >
                {p.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    loading="lazy"
                    style={{
                      width: '100%',
                      aspectRatio: '2 / 1',
                      objectFit: 'cover',
                      display: 'block',
                      background: 'var(--pap2)',
                      filter: ended ? 'grayscale(.6)' : undefined,
                    }}
                  />
                )}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.pinned && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>📌 고정</span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        letterSpacing: '.3px',
                        ...STATUS_STYLE[status],
                      }}
                    >
                      {EVENT_STATUS_LABEL[status]}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--ink3)', marginLeft: 'auto' }}>
                      {eventPeriodLabel(p)}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>{p.title}</div>
                  {p.body && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: 'var(--muted)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {p.body}
                    </div>
                  )}
                </div>
              </Panel>
            );
          })
        )}
      </div>

      <div className="bggap" />
    </>
  );
}
