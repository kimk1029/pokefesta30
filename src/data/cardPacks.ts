/**
 * 모바일 가격탐색 팩 카탈로그.
 * 웹 `src/lib/cardPacks.ts` 와 같은 스니커덩크 apparelGroupId 를 사용한다.
 */

export interface CardPackMeta {
  code: string;
  name: string;
  shortName: string;
  emoji: string;
  bg: string;
  releasedAt?: string;
  searchQuery: string;
  apparelGroupId: number;
}

export const CARD_PACKS: CardPackMeta[] = [
  { code: 'm4', name: '닌자 스피너', shortName: '닌자 스피너', emoji: '🥷', bg: '#2563EB', searchQuery: 'ニンジャスピナー', apparelGroupId: 3320 },
  { code: 'm3', name: '무니키스 제로', shortName: '무니키스 제로', emoji: '🧬', bg: '#7C2D12', searchQuery: 'ムニキスゼロ', apparelGroupId: 3259 },
  { code: 'm2a', name: 'MEGA 드림 ex', shortName: 'MEGA 드림 ex', emoji: '💫', bg: '#C026D3', searchQuery: 'MEGAドリームex', apparelGroupId: 3113 },
  { code: 'm2', name: '인페르노 X', shortName: '인페르노 X', emoji: '🔥', bg: '#DC2626', searchQuery: 'インフェルノX', apparelGroupId: 3074 },
  { code: 'm1s', name: '메가심포니아', shortName: '메가심포니아', emoji: '🎼', bg: '#DB2777', searchQuery: 'メガシンフォニア', apparelGroupId: 3046 },
  { code: 'm1l', name: '메가브레이브', shortName: '메가브레이브', emoji: '⚔️', bg: '#E63946', searchQuery: 'メガブレイブ', apparelGroupId: 3045 },
  { code: 'sv11w', name: '화이트플레어', shortName: '화이트플레어', emoji: '⚪', bg: '#475569', searchQuery: 'ホワイトフレア', apparelGroupId: 2914 },
  { code: 'sv11b', name: '블랙볼트', shortName: '블랙볼트', emoji: '⚫', bg: '#111827', searchQuery: 'ブラックボルト', apparelGroupId: 2913 },
  { code: 'sv10', name: '로켓단의 영광', shortName: '로켓단의 영광', emoji: '🚀', bg: '#991B1B', searchQuery: 'ロケット団の栄光', apparelGroupId: 2700 },
  { code: 'sv9a', name: '열풍의 아리나', shortName: '열풍의 아리나', emoji: '🌪️', bg: '#F97316', searchQuery: '熱風のアリーナ', apparelGroupId: 2621 },
  { code: 'sv9', name: '배틀 파트너즈', shortName: '배틀 파트너즈', emoji: '🤝', bg: '#3A5BD9', releasedAt: '2026-01-24', searchQuery: 'バトルパートナーズ', apparelGroupId: 2455 },
  { code: 'sv8a', name: '테라스타르 페스티벌 ex', shortName: '테라스타르 ex', emoji: '✨', bg: '#7C3AED', releasedAt: '2025-01-24', searchQuery: 'テラスタルフェスティバル', apparelGroupId: 2295 },
  { code: 'sv8', name: '슈퍼일렉트릭 브레이커', shortName: '일렉트릭 브레이커', emoji: '⚡', bg: '#FFD23F', releasedAt: '2024-10-18', searchQuery: '超電ブレイカー', apparelGroupId: 2081 },
  { code: 'sv7a', name: '낙원 드라고나', shortName: '낙원 드라고나', emoji: '🐉', bg: '#22C55E', releasedAt: '2024-09-13', searchQuery: '楽園ドラゴーナ', apparelGroupId: 1884 },
  { code: 'sv7', name: '스텔라 미라클', shortName: '스텔라 미라클', emoji: '🌌', bg: '#0D9488', releasedAt: '2024-07-19', searchQuery: 'ステラミラクル', apparelGroupId: 1469 },
  { code: 'sv6a', name: '나이트 원더러', shortName: '나이트 원더러', emoji: '🌙', bg: '#1B2E89', releasedAt: '2024-06-07', searchQuery: 'ナイトワンダラー', apparelGroupId: 1162 },
  { code: 'sv6', name: '변환의 가면', shortName: '변환의 가면', emoji: '🎭', bg: '#16A34A', searchQuery: '変幻の仮面', apparelGroupId: 812 },
  { code: 'sv5a', name: '크림슨 헤이즈', shortName: '크림슨 헤이즈', emoji: '🔥', bg: '#F97316', releasedAt: '2024-03-22', searchQuery: 'クリムゾンヘイズ', apparelGroupId: 739 },
  { code: 'sv5m', name: '사이버 저지', shortName: '사이버 저지', emoji: '🔷', bg: '#2563EB', searchQuery: 'サイバージャッジ', apparelGroupId: 611 },
  { code: 'sv5k', name: '와일드 포스', shortName: '와일드 포스', emoji: '🟤', bg: '#92400E', searchQuery: 'ワイルドフォース', apparelGroupId: 610 },
  { code: 'sv4a', name: '샤이니 트레저 ex', shortName: '샤이니 트레저', emoji: '💎', bg: '#0891B2', searchQuery: 'シャイニートレジャーex', apparelGroupId: 558 },
  { code: 'sv4m', name: '미래의 일섬', shortName: '미래의 일섬', emoji: '🤖', bg: '#4F46E5', searchQuery: '未来の一閃', apparelGroupId: 546 },
  { code: 'sv4k', name: '고대의 포효', shortName: '고대의 포효', emoji: '🦖', bg: '#B45309', searchQuery: '古代の咆哮', apparelGroupId: 545 },
  { code: 'sv3a', name: '레이징 서프', shortName: '레이징 서프', emoji: '🌊', bg: '#0284C7', searchQuery: 'レイジングサーフ', apparelGroupId: 520 },
  { code: 'sv3', name: '흑염의 지배자', shortName: '흑염의 지배자', emoji: '🖤', bg: '#7F1D1D', searchQuery: '黒炎の支配者', apparelGroupId: 504 },
  { code: 'sv2a', name: '포켓몬 카드 151', shortName: '카드 151', emoji: '1️⃣', bg: '#F59E0B', searchQuery: 'ポケモンカード151', apparelGroupId: 493 },
  { code: 'sv2d', name: '클레이버스트', shortName: '클레이버스트', emoji: '🌋', bg: '#A16207', searchQuery: 'クレイバースト', apparelGroupId: 471 },
  { code: 'sv2p', name: '스노해저드', shortName: '스노해저드', emoji: '❄️', bg: '#0EA5E9', searchQuery: 'スノーハザード', apparelGroupId: 470 },
  { code: 'sv1a', name: '트리플렛 비트', shortName: '트리플렛 비트', emoji: '🎵', bg: '#65A30D', searchQuery: 'トリプレットビート', apparelGroupId: 464 },
  { code: 'sv1v', name: '바이올렛 ex', shortName: '바이올렛 ex', emoji: '🟣', bg: '#6D28D9', searchQuery: 'バイオレットex', apparelGroupId: 458 },
  { code: 'sv1s', name: '스칼렛 ex', shortName: '스칼렛 ex', emoji: '🔴', bg: '#DC2626', searchQuery: 'スカーレットex', apparelGroupId: 457 },
  { code: 's12a', name: 'VSTAR 유니버스', shortName: 'VSTAR 유니버스', emoji: '⭐', bg: '#0F766E', searchQuery: 'VSTARユニバース', apparelGroupId: 1193 },
  { code: 's12', name: '패러다임 트리거', shortName: '패러다임 트리거', emoji: '🌀', bg: '#4338CA', searchQuery: 'パラダイムトリガー', apparelGroupId: 453 },
  { code: 's11', name: '로스트 어비스', shortName: '로스트 어비스', emoji: '🌌', bg: '#581C87', searchQuery: 'ロストアビス', apparelGroupId: 369 },
  { code: 's10b', name: 'Pokemon GO', shortName: 'Pokemon GO', emoji: '📍', bg: '#0369A1', searchQuery: 'Pokemon GO', apparelGroupId: 435 },
  { code: 's8b', name: 'VMAX 클라이맥스', shortName: 'VMAX 클라이맥스', emoji: '🏆', bg: '#BE123C', searchQuery: 'VMAXクライマックス', apparelGroupId: 301 },
  { code: 's6a', name: '이브이 히어로즈', shortName: '이브이 히어로즈', emoji: '🦊', bg: '#EA580C', searchQuery: 'イーブイヒーローズ', apparelGroupId: 450 },
  { code: 's4a', name: '샤이니 스타 V', shortName: '샤이니 스타 V', emoji: '🌟', bg: '#7C3AED', searchQuery: 'シャイニースターV', apparelGroupId: 1565 },
];

export function getCardPack(code: string): CardPackMeta | undefined {
  return CARD_PACKS.find((p) => p.code === code);
}
