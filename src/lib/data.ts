import type {
  FeedItem,
  MyProfile,
  OripaBox,
  OripaResult,
  Place,
  ShopItem,
  Trade,
} from './types';

export const PLACES: Place[] = [
  { id: 'seongsu',   name: '성수역 부근',       emoji: '🚇', bg: '#E63946', level: 'full',   mins: 1,  count: 12 },
  { id: 'seoulsup',  name: '서울숲역 부근',     emoji: '🌳', bg: '#4ADE80', level: 'empty',  mins: 3,  count: 8 },
  { id: 'secret',    name: '시크릿 포레스트',   emoji: '🌲', bg: '#3A5BD9', level: 'normal', mins: 6,  count: 5 },
  { id: 'metamong',  name: '메타몽 놀이터',     emoji: '🎪', bg: '#FFD23F', level: 'busy',   mins: 2,  count: 9 },
  { id: 'shoe',      name: '구두테마공원',       emoji: '👟', bg: '#FB923C', level: 'normal', mins: 14, count: 3 },
  { id: 'rainbow',   name: '무지개어린이공원',   emoji: '🌈', bg: '#FAE8FF', level: 'empty',  mins: 32, count: 2 },
];

export const TRADES: Trade[] = [
  { id: 1, type: 'sell', title: '잉어킹 프로모 코드 1장 판매합니다', place: '성수역 부근',     time: '방금 전', price: '1.5만' },
  { id: 2, type: 'buy',  title: '잉어킹 프로모 구해요! 서울숲 근처', place: '서울숲역 부근',   time: '2분 전',  price: '제안' },
  { id: 3, type: 'sell', title: '프로모 + 굿즈 세트 양도 가능해요', place: '시크릿 포레스트', time: '5분 전',  price: '2.2만' },
  { id: 4, type: 'buy',  title: '프로모만 삽니다 근처 직거래 희망', place: '메타몽 놀이터',   time: '12분 전', price: '1만~' },
  { id: 5, type: 'sell', title: '여분 1장 정가 양도',                place: '구두테마공원',   time: '28분 전', price: '정가' },
];

export const FEED: FeedItem[] = [
  { id: 1, place: '성수역 부근',     level: 'full',   text: '지금 줄이 역까지 이어져요… 40분은 각오!', time: '방금 전', user: '🐢' },
  { id: 2, place: '서울숲역 부근',   level: 'empty',  text: '지금 바로 받을 수 있어요! 사람 거의 없음', time: '3분 전',  user: '🦆' },
  { id: 3, place: '메타몽 놀이터',   level: 'busy',   text: '10명 정도 대기. 회전은 빠른 편',           time: '7분 전',  user: '🐿️' },
  { id: 4, place: '시크릿 포레스트', level: 'normal', text: '스탭 친절하고 대기 보통 수준',              time: '12분 전', user: '🐧' },
];

export const MY_PROFILE: MyProfile = {
  name: '트레이너_24',
  avatar: '🐣',
  rating: '★★★★☆',
  reportCount: 12,
  points: 1250,
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'p-500',     category: 'charge',  emoji: '💎', bg: '#3A5BD9', name: '포인트 500P',    desc: '소량 충전',              price: 1000 },
  { id: 'p-1200',    category: 'charge',  emoji: '💠', bg: '#1B2E89', name: '포인트 1,200P',  desc: '+200P 보너스',            price: 2000, tag: 'hot' },
  { id: 'p-3500',    category: 'charge',  emoji: '🔷', bg: '#0D7377', name: '포인트 3,500P',  desc: '+500P 보너스',            price: 5000 },
  { id: 't-priority',category: 'ticket',  emoji: '🎫', bg: '#E63946', name: '우선 노출 티켓',  desc: '거래글 24시간 상단 고정',  price: 300, tag: 'new' },
  { id: 't-push',    category: 'ticket',  emoji: '📣', bg: '#FB923C', name: '푸시 알림권',     desc: '내 관심 장소 1일 알림',    price: 100 },
  { id: 'sk-ball',   category: 'skin',    emoji: '⚪', bg: '#FFFFFF', name: '몬스터볼 스킨',   desc: '프로필 아이콘 교체',       price: 500 },
  { id: 'sk-badge',  category: 'skin',    emoji: '🏅', bg: '#FFD23F', name: '프리미엄 뱃지',   desc: '닉네임 옆 영구 표시',      price: 800, tag: 'limited' },
  { id: 'sk-frame',  category: 'skin',    emoji: '🖼', bg: '#6B3FA0', name: '프로필 프레임',   desc: '레인보우 테두리',          price: 600 },
];

export const ORIPA_BOXES: OripaBox[] = [
  {
    id: 'box-normal',
    tier: 'normal',
    emoji: '🎁',
    name: '노멀 박스',
    desc: '몬스터볼 디자인 · 뱃지 조각',
    price: 200,
    odds: '레전드 1% · 레어 15% · 노멀 84%',
  },
  {
    id: 'box-rare',
    tier: 'rare',
    emoji: '📦',
    name: '레어 박스',
    desc: '프로필 프레임 · 푸시 알림권',
    price: 500,
    odds: '레전드 5% · 레어 35% · 노멀 60%',
  },
  {
    id: 'box-legend',
    tier: 'legend',
    emoji: '💎',
    name: '레전드 박스',
    desc: '프리미엄 뱃지 · 잉어킹 스킨 보장',
    price: 1500,
    odds: '레전드 25% · 레어 50% · 노멀 25%',
  },
];

export const ORIPA_RESULTS: OripaResult[] = [
  { id: 1, user: '🦊', box: '레전드',   reward: '잉어킹 홀로 프레임', emoji: '🖼', tier: 'legend', time: '방금 전' },
  { id: 2, user: '🐻', box: '레어',     reward: '푸시 알림권 x3',     emoji: '📣', tier: 'rare',   time: '2분 전'  },
  { id: 3, user: '🐤', box: '노멀',     reward: '몬스터볼 스킨',       emoji: '⚪', tier: 'normal', time: '5분 전'  },
  { id: 4, user: '🦆', box: '레어',     reward: '프리미엄 뱃지',       emoji: '🏅', tier: 'rare',   time: '7분 전'  },
  { id: 5, user: '🐢', box: '레전드',   reward: '레인보우 프레임',     emoji: '🌈', tier: 'legend', time: '12분 전' },
];
