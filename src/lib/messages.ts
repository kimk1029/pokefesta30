import { prisma } from './prisma';

export interface MessageRow {
  id: number;
  senderId: string;
  receiverId: string;
  text: string;
  tradeId: number | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface Thread {
  peerId: string;
  peerName: string;
  peerAvatar: string;        // avatar id or emoji
  peerBgId: string;
  peerFrameId: string;
  lastText: string;
  lastAt: Date;
  lastFromMe: boolean;
  unread: number;
}

/** 내가 주고받은 모든 상대별 최근 메시지 + unread 개수 */
export async function getThreads(myId: string): Promise<Thread[]> {
  // 내가 보낸 것 + 받은 것 전부 가져와서 peerId 로 그룹핑
  const rows = await prisma.message.findMany({
    where: { OR: [{ senderId: myId }, { receiverId: myId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: { id: true, name: true, avatarId: true, backgroundId: true, frameId: true },
      },
      receiver: {
        select: { id: true, name: true, avatarId: true, backgroundId: true, frameId: true },
      },
    },
  });

  const threadMap = new Map<string, Thread>();
  for (const r of rows) {
    const isFromMe = r.senderId === myId;
    const peerId = isFromMe ? r.receiverId : r.senderId;
    const peer = isFromMe ? r.receiver : r.sender;
    if (!threadMap.has(peerId)) {
      threadMap.set(peerId, {
        peerId,
        peerName: peer.name,
        peerAvatar: peer.avatarId,
        peerBgId: peer.backgroundId,
        peerFrameId: peer.frameId,
        lastText: r.text,
        lastAt: r.createdAt,
        lastFromMe: isFromMe,
        unread: 0,
      });
    }
    if (!isFromMe && r.readAt === null) {
      const t = threadMap.get(peerId);
      if (t) t.unread += 1;
    }
  }
  return Array.from(threadMap.values()).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export async function getConversation(
  myId: string,
  peerId: string,
  limit = 100,
): Promise<MessageRow[]> {
  const rows = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: myId, receiverId: peerId },
        { senderId: peerId, receiverId: myId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    receiverId: r.receiverId,
    text: r.text,
    tradeId: r.tradeId,
    readAt: r.readAt,
    createdAt: r.createdAt,
  }));
}

export async function markThreadRead(myId: string, peerId: string): Promise<void> {
  await prisma.message.updateMany({
    where: { senderId: peerId, receiverId: myId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function getUnreadCount(myId: string): Promise<number> {
  return prisma.message.count({
    where: { receiverId: myId, readAt: null },
  });
}
