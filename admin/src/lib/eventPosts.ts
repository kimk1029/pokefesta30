const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface EventPostInput {
  title?: string;
  body?: string;
  imageUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  pinned?: boolean;
  published?: boolean;
}

type ParseResult = { ok: true; data: EventPostInput } | { ok: false; error: string };

/** 이벤트 글 입력 검증. partial=true 면 PATCH(누락 필드 허용). */
export function parseEventPostInput(raw: Record<string, unknown>, partial: boolean): ParseResult {
  const data: EventPostInput = {};

  if (raw.title !== undefined) {
    if (typeof raw.title !== 'string' || !raw.title.trim()) return { ok: false, error: 'title 이 비어있습니다' };
    data.title = raw.title.trim();
  } else if (!partial) {
    return { ok: false, error: 'title 이 필요합니다' };
  }

  if (raw.body !== undefined) {
    if (typeof raw.body !== 'string') return { ok: false, error: 'body 는 문자열이어야 합니다' };
    data.body = raw.body;
  }

  for (const key of ['imageUrl', 'startsAt', 'endsAt'] as const) {
    if (raw[key] === undefined) continue;
    const v = raw[key];
    if (v === null || v === '') {
      data[key] = null;
      continue;
    }
    if (typeof v !== 'string') return { ok: false, error: `${key} 는 문자열이어야 합니다` };
    if (key !== 'imageUrl' && !DATE_RE.test(v)) {
      return { ok: false, error: `${key} 는 YYYY-MM-DD 형식이어야 합니다` };
    }
    data[key] = v;
  }

  if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) {
    return { ok: false, error: '종료일이 시작일보다 빠릅니다' };
  }

  for (const key of ['pinned', 'published'] as const) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] !== 'boolean') return { ok: false, error: `${key} 는 boolean 이어야 합니다` };
    data[key] = raw[key] as boolean;
  }

  return { ok: true, data };
}
