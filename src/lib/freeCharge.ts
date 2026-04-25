/** 무료충전소 — 광고 시청 보상 슬롯 정의. */

export interface FreeChargeSlot {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  reward: number;
  /** 슬롯별 재충전 쿨다운 (초). */
  cooldownSec: number;
  /** 하루 시청 가능 횟수. */
  dailyLimit: number;
  network: string;
}

export const FREE_CHARGE_SLOTS: FreeChargeSlot[] = [
  {
    id: 'ad-short',
    emoji: '📺',
    title: '15초 광고 시청',
    desc: '짧은 영상 광고',
    reward: 10,
    cooldownSec: 60,
    dailyLimit: 20,
    network: 'house',
  },
  {
    id: 'ad-long',
    emoji: '🎬',
    title: '30초 광고 시청',
    desc: '리워드형 영상',
    reward: 30,
    cooldownSec: 180,
    dailyLimit: 10,
    network: 'house',
  },
  {
    id: 'ad-offer',
    emoji: '🎁',
    title: '제휴 앱 설치/체험',
    desc: '오퍼월 — 조건 달성 시 지급',
    reward: 200,
    cooldownSec: 3600,
    dailyLimit: 3,
    network: 'offerwall',
  },
];

export function getSlot(id: string): FreeChargeSlot | undefined {
  return FREE_CHARGE_SLOTS.find((s) => s.id === id);
}
