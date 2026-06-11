/** 이벤트 게시판 글 — 서버 /api/events 응답 행. */
export interface EventPost {
  id: number;
  title: string;
  body: string;
  imageUrl: string | null;
  /** 'YYYY-MM-DD'. 둘 다 null 이면 상시 이벤트. */
  startsAt: string | null;
  endsAt: string | null;
  pinned: boolean;
  published: boolean;
  /** 작성자 이름 — null = 어드민 작성 공지. */
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'always' | 'upcoming' | 'ongoing' | 'ended';

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  always: '상시',
  upcoming: '예정',
  ongoing: '진행중',
  ended: '종료',
};

/** KST 기준 오늘 날짜 ('YYYY-MM-DD'). */
function todayKst(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export function eventStatus(p: Pick<EventPost, 'startsAt' | 'endsAt'>): EventStatus {
  if (!p.startsAt && !p.endsAt) return 'always';
  const today = todayKst();
  if (p.startsAt && today < p.startsAt) return 'upcoming';
  if (p.endsAt && today > p.endsAt) return 'ended';
  return 'ongoing';
}

/** '2026-06-15' → '2026.06.15', 기간 라벨 '6.15 ~ 6.30' 형태. */
export function eventPeriodLabel(p: Pick<EventPost, 'startsAt' | 'endsAt'>): string {
  const fmt = (d: string) => d.replaceAll('-', '.');
  if (!p.startsAt && !p.endsAt) return '상시 진행';
  if (p.startsAt && p.endsAt) return `${fmt(p.startsAt)} ~ ${fmt(p.endsAt)}`;
  if (p.startsAt) return `${fmt(p.startsAt)} ~`;
  return `~ ${fmt(p.endsAt!)}`;
}
