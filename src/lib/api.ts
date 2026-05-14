/**
 * API 레이어 — 원본 lib/queries.ts와 같은 형태로 데이터를 반환.
 * Supabase가 설정되어 있으면 실 쿼리, 아니면 mock 데이터 폴백.
 *
 * 원본 Next.js 앱의 schema와 동일한 테이블을 가정:
 *   - places(id, name, emoji, bg, lat, lng)
 *   - reports(id, place_id, level, note, author, created_at)
 *   - trades(id, type, title, body, place_id, price, author, created_at)
 *
 * 추가 테이블(messages, oripa, shop_items 등)은 원본 DB에서 확인 후 확장 필요.
 */
import { supabase, hasSupabase } from './supabase';
import {
  PLACES,
  TRADES,
  FEED,
  ORIPA_BOXES,
  ORIPA_RESULTS,
  ORIPA_TICKETS,
  SHOP_ITEMS,
  MESSAGE_THREADS,
  CHAT_THREAD,
  CARDS,
  HERO_SLIDES,
} from './data';
import type {
  Place,
  Trade,
  FeedItem,
  OripaBox,
  OripaResult,
  OripaTicket,
  ShopItem,
  MessageThread,
  ChatMessage,
  CardItem,
  CongLevel,
} from './types';

export async function getPlaces(): Promise<Place[]> {
  if (!supabase) return PLACES;
  const { data, error } = await supabase
    .from('places')
    .select('id,name,emoji,bg')
    .limit(20);
  if (error || !data || data.length === 0) return PLACES;
  return data.map((row, i) => ({
    id: String(row.id),
    name: String(row.name),
    emoji: String(row.emoji ?? '📍'),
    bg: String(row.bg ?? PLACES[i % PLACES.length].bg),
    level: PLACES[i % PLACES.length].level,
    mins: PLACES[i % PLACES.length].mins,
    count: PLACES[i % PLACES.length].count,
  }));
}

export async function getFeedPosts(limit = 5): Promise<FeedItem[]> {
  if (!supabase) return FEED.slice(0, limit);
  const { data, error } = await supabase
    .from('reports')
    .select('id,place_id,level,note,author,created_at,places(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return FEED.slice(0, limit);
  return data.map((row, i) => ({
    id: Number(row.id) || i,
    place: (row as any).places?.name ?? '알 수 없음',
    level: ((row as any).level as CongLevel) ?? 'normal',
    text: String((row as any).note ?? ''),
    time: '방금 전',
    user: '🐤',
  }));
}

export async function getTrades(): Promise<Trade[]> {
  if (!supabase) return TRADES;
  const { data, error } = await supabase
    .from('trades')
    .select('id,type,title,price,created_at,places(name)')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data || data.length === 0) return TRADES;
  return data.map((row, i) => ({
    id: Number((row as any).id) || i,
    type: ((row as any).type as Trade['type']) ?? 'sell',
    title: String((row as any).title ?? ''),
    place: (row as any).places?.name ?? '',
    time: '방금 전',
    price: String((row as any).price ?? '제안'),
  }));
}

// 아래 4개는 원본 schema에 해당 테이블이 없거나 기능이 백엔드 의존이라
// 일단 mock 반환만. 백엔드 추가 시 위 패턴으로 실 쿼리로 교체.
export async function getOripaBoxes(): Promise<OripaBox[]> {
  return ORIPA_BOXES;
}
export async function getOripaResults(): Promise<OripaResult[]> {
  return ORIPA_RESULTS;
}
export async function getOripaTickets(): Promise<OripaTicket[]> {
  return ORIPA_TICKETS;
}
export async function getShopItems(): Promise<ShopItem[]> {
  return SHOP_ITEMS;
}
export async function getMessageThreads(): Promise<MessageThread[]> {
  return MESSAGE_THREADS;
}
export async function getChatThread(peerId: string): Promise<ChatMessage[]> {
  return CHAT_THREAD[peerId] ?? [];
}
export async function getCards(): Promise<CardItem[]> {
  return CARDS;
}
export async function getHeroSlides() {
  return HERO_SLIDES;
}
