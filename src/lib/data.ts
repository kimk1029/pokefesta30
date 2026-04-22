import type { FeedItem, Place, Trade } from './types';

export const PLACES: Place[] = [
  { id: 'seongsu',   name: '성수역 부근',       emoji: '🚇', bg: '#E63946', level: 'full',   mins: 1,  count: 12 },
  { id: 'seoulsup',  name: '서울숲역 부근',     emoji: '🌳', bg: '#4ADE80', level: 'empty',  mins: 3,  count: 8 },
  { id: 'secret',    name: '시크릿 포레스트',   emoji: '🌲', bg: '#3A5BD9', level: 'normal', mins: 6,  count: 5 },
  { id: 'metamong',  name: '메타몽 놀이터',     emoji: '🎪', bg: '#FFD23F', level: 'busy',   mins: 2,  count: 9 },
  { id: 'shoe',      name: '구두테마공원',       emoji: '👟', bg: '#FB923C', level: 'normal', mins: 14, count: 3 },
  { id: 'rainbow',   name: '무지개어린이공원',   emoji: '🌈', bg: '#F7F3E3', level: 'empty',  mins: 32, count: 2 },
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
