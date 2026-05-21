/** 쪽지 타입 (서버 구현은 server/lib/messages.ts). */

export interface Thread {
  peerId: string;
  peerName: string;
  peerAvatar: string;
  peerBgId: string;
  peerFrameId: string;
  lastText: string;
  lastAt: Date | string;
  lastFromMe: boolean;
  unread: number;
}

export interface MessageRow {
  id: number;
  senderId: string;
  receiverId: string;
  text: string;
  tradeId: number | null;
  readAt: Date | string | null;
  createdAt: Date | string;
}
