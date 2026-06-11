import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { EventComments } from '@/components/events/EventComments';
import { serverFetch } from '@/lib/apiServer';
import {
  EVENT_STATUS_LABEL,
  eventPeriodLabel,
  eventStatus,
  type EventPost,
} from '@/lib/events';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  const id = Number(params.id);
  if (isNaN(id)) notFound();

  const r = await serverFetch<{ data: EventPost }>(`/api/events/${id}`, {
    auth: false,
    revalidate: 60,
  });
  const post = r.data?.data;
  if (!post) notFound();

  const status = eventStatus(post);

  return (
    <>
      <StatusBar />
      <AppBar title="이벤트" showBack backHref="/events" />

      <div style={{ padding: '16px var(--gap)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 7px',
              letterSpacing: '.3px',
              background: status === 'ongoing' ? 'var(--accent)' : 'var(--pap2)',
              color: status === 'ongoing' ? '#fff' : status === 'ended' ? 'var(--ink3)' : 'var(--ink)',
            }}
          >
            {EVENT_STATUS_LABEL[status]}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{eventPeriodLabel(post)}</span>
          <span style={{ fontSize: 11, color: 'var(--ink3)', marginLeft: 'auto' }}>
            {post.authorName ? `✍ ${post.authorName}` : '공지'}
          </span>
        </div>

        <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>{post.title}</div>

        {post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt=""
            style={{
              width: '100%',
              display: 'block',
              background: 'var(--pap2)',
              boxShadow:
                '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
            }}
          />
        )}

        {post.body && (
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
            }}
          >
            {post.body}
          </div>
        )}

        <EventComments postId={post.id} />
      </div>

      <div className="bggap" />
    </>
  );
}
