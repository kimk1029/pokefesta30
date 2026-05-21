/**
 * 카드 팩 카탈로그 - 홈/팩 상세에서 "팩별 힛카드" 그리드를 만드는 시드.
 *
 * 각 팩은 다음 두 가지 방식으로 힛카드를 채운다:
 *   1) group: `apparelGroupId` 로 스니커덩크 박스/싱글카드 그룹을 직접 조회
 *   2) curated/fallback: `hits` 배열 또는 `searchQuery` 검색으로 부족분 채움
 *
 * 따라서 `hits` 가 비어 있어도 시스템은 그룹 API와 검색만으로 동작한다.
 */

export interface CardPackHit {
  /** snkrdunk apparelId */
  apparelId: number;
  /** UI에 보일 이름 override (없으면 snkrdunk 응답의 localizedName 사용) */
  label?: string;
}

export interface CardPackMeta {
  /** 팩 코드 - 라우팅 슬러그로도 쓰임 (예: 'sv8a') */
  code: string;
  /** 풀 한국어 이름 */
  name: string;
  /** 카드 상단에 짧게 표시될 한국어 라벨 */
  shortName: string;
  /** 시각적 강조용 이모지 */
  emoji: string;
  /** 카드 상단 띠 배경 색 (theme tokens 의 hex 와 일관) */
  bg: string;
  /** 일본 출시일 (YYYY-MM-DD) - 정렬/표시에 사용 */
  releasedAt?: string;
  /** snkrdunk 검색 키워드 - `hits` 가 비어있을 때 자동 채움 */
  searchQuery: string;
  /** snkrdunk apparel group id - 박스별 전체 수록 싱글카드 목록 조회에 사용 */
  apparelGroupId?: number;
  /** 큐레이션된 카드 (apparelId 알면 박아둠) */
  hits: CardPackHit[];
}

/**
 * 주요 팩 카탈로그.
 * `apparelGroupId` 가 있으면 스니커덩크 그룹 API에서 박스/싱글을 직접 가져온다.
 */
export const CARD_PACKS: CardPackMeta[] = [
  {
    code: 'm4',
    name: '닌자 스피너',
    shortName: '닌자 스피너',
    emoji: '🥷',
    bg: '#2563EB',
    searchQuery: 'ニンジャスピナー',
    apparelGroupId: 3320,
    hits: [],
  },
  {
    code: 'm3',
    name: '무니키스 제로',
    shortName: '무니키스 제로',
    emoji: '🧬',
    bg: '#7C2D12',
    searchQuery: 'ムニキスゼロ',
    apparelGroupId: 3259,
    hits: [],
  },
  {
    code: 'm2a',
    name: 'MEGA 드림 ex',
    shortName: 'MEGA 드림 ex',
    emoji: '💫',
    bg: '#C026D3',
    searchQuery: 'MEGAドリームex',
    apparelGroupId: 3113,
    hits: [],
  },
  {
    code: 'm2',
    name: '인페르노 X',
    shortName: '인페르노 X',
    emoji: '🔥',
    bg: '#DC2626',
    searchQuery: 'インフェルノX',
    apparelGroupId: 3074,
    hits: [],
  },
  {
    code: 'm1s',
    name: '메가심포니아',
    shortName: '메가심포니아',
    emoji: '🎼',
    bg: '#DB2777',
    searchQuery: 'メガシンフォニア',
    apparelGroupId: 3046,
    hits: [],
  },
  {
    code: 'm1l',
    name: '메가브레이브',
    shortName: '메가브레이브',
    emoji: '⚔️',
    bg: '#E63946',
    searchQuery: 'メガブレイブ',
    apparelGroupId: 3045,
    hits: [],
  },
  {
    code: 'sv11w',
    name: '화이트플레어',
    shortName: '화이트플레어',
    emoji: '⚪',
    bg: '#475569',
    searchQuery: 'ホワイトフレア',
    apparelGroupId: 2914,
    hits: [],
  },
  {
    code: 'sv11b',
    name: '블랙볼트',
    shortName: '블랙볼트',
    emoji: '⚫',
    bg: '#111827',
    searchQuery: 'ブラックボルト',
    apparelGroupId: 2913,
    hits: [],
  },
  {
    code: 'sv10',
    name: '로켓단의 영광',
    shortName: '로켓단의 영광',
    emoji: '🚀',
    bg: '#991B1B',
    searchQuery: 'ロケット団の栄光',
    apparelGroupId: 2700,
    hits: [],
  },
  {
    code: 'sv9a',
    name: '열풍의 아리나',
    shortName: '열풍의 아리나',
    emoji: '🌪️',
    bg: '#F97316',
    searchQuery: '熱風のアリーナ',
    apparelGroupId: 2621,
    hits: [],
  },
  {
    code: 'sv9',
    name: '배틀 파트너즈',
    shortName: '배틀 파트너즈',
    emoji: '🤝',
    bg: '#3A5BD9',
    releasedAt: '2026-01-24',
    searchQuery: 'バトルパートナーズ',
    apparelGroupId: 2455,
    hits: [],
  },
  {
    code: 'sv8a',
    name: '테라스타르 페스티벌 ex',
    shortName: '테라스타르 ex',
    emoji: '✨',
    bg: '#7C3AED',
    releasedAt: '2025-01-24',
    searchQuery: 'テラスタルフェスティバル',
    apparelGroupId: 2295,
    hits: [],
  },
  {
    code: 'sv8',
    name: '슈퍼일렉트릭 브레이커',
    shortName: '일렉트릭 브레이커',
    emoji: '⚡',
    bg: '#FFD23F',
    releasedAt: '2024-10-18',
    searchQuery: '超電ブレイカー',
    apparelGroupId: 2081,
    hits: [],
  },
  {
    code: 'sv7a',
    name: '낙원 드라고나',
    shortName: '낙원 드라고나',
    emoji: '🐉',
    bg: '#22C55E',
    releasedAt: '2024-09-13',
    searchQuery: '楽園ドラゴーナ',
    apparelGroupId: 1884,
    hits: [],
  },
  {
    code: 'sv7',
    name: '스텔라 미라클',
    shortName: '스텔라 미라클',
    emoji: '🌌',
    bg: '#0D9488',
    releasedAt: '2024-07-19',
    searchQuery: 'ステラミラクル',
    apparelGroupId: 1469,
    hits: [],
  },
  {
    code: 'sv6a',
    name: '나이트 원더러',
    shortName: '나이트 원더러',
    emoji: '🌙',
    bg: '#1B2E89',
    releasedAt: '2024-06-07',
    searchQuery: 'ナイトワンダラー',
    apparelGroupId: 1162,
    hits: [],
  },
  {
    code: 'sv6',
    name: '변환의 가면',
    shortName: '변환의 가면',
    emoji: '🎭',
    bg: '#16A34A',
    searchQuery: '変幻の仮面',
    apparelGroupId: 812,
    hits: [],
  },
  {
    code: 'sv5a',
    name: '크림슨 헤이즈',
    shortName: '크림슨 헤이즈',
    emoji: '🔥',
    bg: '#F97316',
    releasedAt: '2024-03-22',
    searchQuery: 'クリムゾンヘイズ',
    apparelGroupId: 739,
    hits: [],
  },
  {
    code: 'sv5m',
    name: '사이버 저지',
    shortName: '사이버 저지',
    emoji: '🔷',
    bg: '#2563EB',
    searchQuery: 'サイバージャッジ',
    apparelGroupId: 611,
    hits: [],
  },
  {
    code: 'sv5k',
    name: '와일드 포스',
    shortName: '와일드 포스',
    emoji: '🟤',
    bg: '#92400E',
    searchQuery: 'ワイルドフォース',
    apparelGroupId: 610,
    hits: [],
  },
  {
    code: 'sv4a',
    name: '샤이니 트레저 ex',
    shortName: '샤이니 트레저',
    emoji: '💎',
    bg: '#0891B2',
    searchQuery: 'シャイニートレジャーex',
    apparelGroupId: 558,
    hits: [],
  },
  {
    code: 'sv4m',
    name: '미래의 일섬',
    shortName: '미래의 일섬',
    emoji: '🤖',
    bg: '#4F46E5',
    searchQuery: '未来の一閃',
    apparelGroupId: 546,
    hits: [],
  },
  {
    code: 'sv4k',
    name: '고대의 포효',
    shortName: '고대의 포효',
    emoji: '🦖',
    bg: '#B45309',
    searchQuery: '古代の咆哮',
    apparelGroupId: 545,
    hits: [],
  },
  {
    code: 'sv3a',
    name: '레이징 서프',
    shortName: '레이징 서프',
    emoji: '🌊',
    bg: '#0284C7',
    searchQuery: 'レイジングサーフ',
    apparelGroupId: 520,
    hits: [],
  },
  {
    code: 'sv3',
    name: '흑염의 지배자',
    shortName: '흑염의 지배자',
    emoji: '🖤',
    bg: '#7F1D1D',
    searchQuery: '黒炎の支配者',
    apparelGroupId: 504,
    hits: [],
  },
  {
    code: 'sv2a',
    name: '포켓몬 카드 151',
    shortName: '카드 151',
    emoji: '1️⃣',
    bg: '#F59E0B',
    searchQuery: 'ポケモンカード151',
    apparelGroupId: 493,
    hits: [],
  },
  {
    code: 'sv2d',
    name: '클레이버스트',
    shortName: '클레이버스트',
    emoji: '🌋',
    bg: '#A16207',
    searchQuery: 'クレイバースト',
    apparelGroupId: 471,
    hits: [],
  },
  {
    code: 'sv2p',
    name: '스노해저드',
    shortName: '스노해저드',
    emoji: '❄️',
    bg: '#0EA5E9',
    searchQuery: 'スノーハザード',
    apparelGroupId: 470,
    hits: [],
  },
  {
    code: 'sv1a',
    name: '트리플렛 비트',
    shortName: '트리플렛 비트',
    emoji: '🎵',
    bg: '#65A30D',
    searchQuery: 'トリプレットビート',
    apparelGroupId: 464,
    hits: [],
  },
  {
    code: 'sv1v',
    name: '바이올렛 ex',
    shortName: '바이올렛 ex',
    emoji: '🟣',
    bg: '#6D28D9',
    searchQuery: 'バイオレットex',
    apparelGroupId: 458,
    hits: [],
  },
  {
    code: 'sv1s',
    name: '스칼렛 ex',
    shortName: '스칼렛 ex',
    emoji: '🔴',
    bg: '#DC2626',
    searchQuery: 'スカーレットex',
    apparelGroupId: 457,
    hits: [],
  },
  {
    code: 's12a',
    name: 'VSTAR 유니버스',
    shortName: 'VSTAR 유니버스',
    emoji: '⭐',
    bg: '#0F766E',
    searchQuery: 'VSTARユニバース',
    apparelGroupId: 1193,
    hits: [],
  },
  {
    code: 's12',
    name: '패러다임 트리거',
    shortName: '패러다임 트리거',
    emoji: '🌀',
    bg: '#4338CA',
    searchQuery: 'パラダイムトリガー',
    apparelGroupId: 453,
    hits: [],
  },
  {
    code: 's11',
    name: '로스트 어비스',
    shortName: '로스트 어비스',
    emoji: '🌌',
    bg: '#581C87',
    searchQuery: 'ロストアビス',
    apparelGroupId: 369,
    hits: [],
  },
  {
    code: 's10b',
    name: 'Pokemon GO',
    shortName: 'Pokemon GO',
    emoji: '📍',
    bg: '#0369A1',
    searchQuery: 'Pokemon GO',
    apparelGroupId: 435,
    hits: [],
  },
  {
    code: 's8b',
    name: 'VMAX 클라이맥스',
    shortName: 'VMAX 클라이맥스',
    emoji: '🏆',
    bg: '#BE123C',
    searchQuery: 'VMAXクライマックス',
    apparelGroupId: 301,
    hits: [],
  },
  {
    code: 's6a',
    name: '이브이 히어로즈',
    shortName: '이브이 히어로즈',
    emoji: '🦊',
    bg: '#EA580C',
    searchQuery: 'イーブイヒーローズ',
    apparelGroupId: 450,
    hits: [],
  },
  {
    code: 's4a',
    name: '샤이니 스타 V',
    shortName: '샤이니 스타 V',
    emoji: '🌟',
    bg: '#7C3AED',
    searchQuery: 'シャイニースターV',
    apparelGroupId: 1565,
    hits: [],
  },
];

export function getCardPack(code: string): CardPackMeta | undefined {
  return CARD_PACKS.find((p) => p.code === code);
}

/**
 * 카드 팩 코드 enum.
 * `CARD_PACKS` 의 `code` 와 1:1 대응. UI 코드가 magic string ('sv9') 대신
 * `CardPackCode.SV9` 를 쓰면 오타/누락 컴파일러가 잡아준다.
 *
 * 키는 대문자 + 점 제거 (e.g. 'sv11w' → SV11W, 'm1l' → M1L).
 */
export enum CardPackCode {
  M4 = 'm4',
  M3 = 'm3',
  M2A = 'm2a',
  M2 = 'm2',
  M1S = 'm1s',
  M1L = 'm1l',
  SV11W = 'sv11w',
  SV11B = 'sv11b',
  SV10 = 'sv10',
  SV9A = 'sv9a',
  SV9 = 'sv9',
  SV8A = 'sv8a',
  SV8 = 'sv8',
  SV7A = 'sv7a',
  SV7 = 'sv7',
  SV6A = 'sv6a',
  SV6 = 'sv6',
  SV5A = 'sv5a',
  SV5M = 'sv5m',
  SV5K = 'sv5k',
  SV4A = 'sv4a',
  SV4M = 'sv4m',
  SV4K = 'sv4k',
  SV3A = 'sv3a',
  SV3 = 'sv3',
  SV2A = 'sv2a',
  SV2D = 'sv2d',
  SV2P = 'sv2p',
  SV1A = 'sv1a',
  SV1V = 'sv1v',
  SV1S = 'sv1s',
  S12A = 's12a',
  S12 = 's12',
  S11 = 's11',
  S10B = 's10b',
  S8B = 's8b',
  S6A = 's6a',
  S4A = 's4a',
}

/** enum 으로 등록된 모든 팩 코드 (CARD_PACKS 의 순서 그대로). */
export const CARD_PACK_CODES: readonly CardPackCode[] = Object.values(CardPackCode);

/**
 * enum / 문자열 어느 쪽으로도 호출 가능한 메타 조회.
 * 알 수 없는 코드면 `undefined`.
 */
export function getCardPackMeta(code: CardPackCode | string): CardPackMeta | undefined {
  return CARD_PACKS.find((p) => p.code === code);
}

/** runtime 에서 임의 문자열이 등록된 팩 코드인지 검증. */
export function isCardPackCode(code: string): code is CardPackCode {
  return CARD_PACK_CODES.includes(code as CardPackCode);
}
