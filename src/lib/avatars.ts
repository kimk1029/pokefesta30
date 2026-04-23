export type AvatarId =
  | 'bulbasaur'
  | 'charmander'
  | 'squirtle'
  | 'pikachu'
  | 'eevee'
  | 'snorlax'
  | 'ditto'
  | 'lapras'
  | 'mewtwo'
  | 'moltres';

export interface AvatarMeta {
  id: AvatarId;
  name: string;
  locked: boolean;
  unlockHint?: string;
}

export const AVATARS: AvatarMeta[] = [
  { id: 'bulbasaur',  name: '이상해씨', locked: false },
  { id: 'charmander', name: '파이리',   locked: false },
  { id: 'squirtle',   name: '꼬부기',   locked: false },
  { id: 'pikachu',    name: '피카츄',   locked: false },
  { id: 'eevee',      name: '이브이',   locked: false },
  { id: 'ditto',      name: '메타몽',   locked: true, unlockHint: 'LV.5 달성' },
  { id: 'snorlax',    name: '잠만보',   locked: true, unlockHint: '제보 20건' },
  { id: 'lapras',     name: '라프라스', locked: true, unlockHint: '거래 5건 완료' },
  { id: 'moltres',    name: '파이어',   locked: true, unlockHint: '이벤트 한정' },
  { id: 'mewtwo',     name: '뮤츠',     locked: true, unlockHint: '🏆 레전드 등급' },
];

export const DEFAULT_AVATAR: AvatarId = 'bulbasaur';

const AVATAR_IDS = new Set<string>(AVATARS.map((a) => a.id));

export function isAvatarId(v: unknown): v is AvatarId {
  return typeof v === 'string' && AVATAR_IDS.has(v);
}

export function getAvatarMeta(id: AvatarId): AvatarMeta {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
