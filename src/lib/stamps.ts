/** 포케페스타30 x 잉어킹 프로모 — 스탬프 랠리 스펙. */

export interface StampSpot {
  no: number;
  /** places.id 와 매칭 */
  placeId: string;
  name: string;
  subtitle?: string;
  emoji: string;
  bg: string;
}

export const STAMP_SPOTS: StampSpot[] = [
  { no: 1, placeId: 'rainbow',  name: '메타몽 놀이터',     subtitle: '무지개 어린이공원',          emoji: '🎪', bg: '#FFD23F' },
  { no: 2, placeId: 'trend',    name: '트렌드 팟',         subtitle: '올리브영 성수',               emoji: '💄', bg: '#FB923C' },
  { no: 3, placeId: 'shoe',     name: '성수 어린이 테마공원',                                       emoji: '🎠', bg: '#4ADE80' },
  { no: 4, placeId: 'ddukseom', name: '뚝섬역 주변',       subtitle: '한강공원 인접',               emoji: '🚇', bg: '#6FC0E5' },
  { no: 5, placeId: 'seongsu',  name: '성수역 주변',       subtitle: '성수동 중심부',               emoji: '🌆', bg: '#E63946' },
  { no: 6, placeId: 'secret',   name: '서울숲 은행나무길', subtitle: '포켓몬 시크릿 포레스트',      emoji: '🌲', bg: '#6B3FA0' },
];

export interface StampReward {
  count: number;
  title: string;
  summary: string;
  emoji: string;
  desc: string;
  color: string;
}

export const STAMP_REWARDS: StampReward[] = [
  {
    count: 1,
    title: '첫 스탬프 보상',
    summary: '포켓몬 스티커',
    emoji: '🎁',
    desc: '첫 번째 포켓스탑 방문 시 한정판 포켓몬 스티커 1매 증정',
    color: '#4ADE80',
  },
  {
    count: 3,
    title: '잉어킹 프로모 카드',
    summary: '메인 보상',
    emoji: '🎴',
    desc: '스탬프 3개 수집 시 잉어킹 한정 프로모 카드 지급. 페스타 한정 일러스트',
    color: '#E63946',
  },
  {
    count: 6,
    title: '그랜드 프라이즈 응모권',
    summary: '경품 응모',
    emoji: '🏆',
    desc: '스탬프 6개 전부 모으면 대형 경품 응모권 제공. 추첨으로 굿즈 패키지 증정',
    color: '#FFD23F',
  },
];

export const EVENT_META = {
  title: '포케페스타30 × 잉어킹 프로모',
  period: '2026.05.01 – 05.31',
  location: '서울 성수 일대',
  how: '포켓몬 GO 앱에서 6곳의 포켓스탑 방문 → 스탬프 수집 → 보상 센터 방문하여 교환',
};
