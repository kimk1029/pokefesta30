import { EventPostManager, type EventPostData } from '@/components/EventPostManager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let posts: EventPostData[] = [];
  try {
    const rows = await prisma.eventPost.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
    posts = rows.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      imageUrl: p.imageUrl,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      pinned: p.pinned,
      published: p.published,
      createdAt: p.createdAt.toISOString(),
    }));
  } catch (e) {
    console.error('[admin.eventPosts.page]', e);
  }

  return (
    <>
      <h1 className="admin-h1">이벤트 게시판</h1>
      <p className="admin-sub">
        웹 /events 게시판 글 관리 — 비공개 글은 웹에 노출되지 않습니다. 기간을 비우면 상시 이벤트로 표시됩니다.
      </p>
      <EventPostManager initialPosts={posts} />
    </>
  );
}
