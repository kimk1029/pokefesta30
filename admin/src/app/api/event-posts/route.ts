import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseEventPostInput } from '@/lib/eventPosts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = await prisma.eventPost.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ posts });
  } catch (err) {
    console.error('[admin.eventPosts.GET]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const v = parseEventPostInput(body, false);
  if (v.ok === false) return NextResponse.json({ error: v.error }, { status: 400 });
  try {
    const post = await prisma.eventPost.create({
      data: {
        title: v.data.title!,
        body: v.data.body ?? '',
        imageUrl: v.data.imageUrl ?? null,
        startsAt: v.data.startsAt ?? null,
        endsAt: v.data.endsAt ?? null,
        pinned: v.data.pinned ?? false,
        published: v.data.published ?? true,
      },
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error('[admin.eventPosts.POST]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
