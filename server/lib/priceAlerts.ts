/**
 * 가격 알림 체커 — 활성(triggeredAt=null) price_alerts 를 돌며 현재 시세를 확인,
 * 목표가(JPY) 이하로 내려온 알림은 Message 로 통지하고 triggeredAt 을 채워 비활성화한다.
 *
 * 별도 워커/크론이 없으므로 서버 프로세스(단일 인스턴스) 안에서 setInterval 로 주기 실행.
 * (pm2 ecosystem 의 pokefesta30-server 는 1 인스턴스라 중복 실행 위험 없음.)
 */
import { prisma } from './prisma.js';
import { fetchApparelPrices } from '@/lib/snkrdunkPrice';

/** 시스템 발신자(알림 봇) — 알림함에 "아르보TCG 가격알림" 스레드로 보이게 한다. */
const SYSTEM_SENDER_ID = 'system-price-alert';
const SYSTEM_SENDER_NAME = '아르보TCG 가격알림';

/** 기본 점검 주기(ms). 시세 캐시(10분)와 맞춰 15분. */
export const PRICE_ALERT_INTERVAL_MS = 15 * 60_000;

function fmtYen(n: number): string {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

let running = false;

/** 활성 알림을 1회 점검. 트리거된 알림 수를 반환. */
export async function runPriceAlertCheck(): Promise<number> {
  if (running) return 0; // 이전 실행이 안 끝났으면 스킵(겹침 방지)
  running = true;
  let triggered = 0;
  try {
    const alerts = await prisma.priceAlert.findMany({
      where: { triggeredAt: null },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });
    if (alerts.length === 0) return 0;

    // 같은 카드에 여러 알림이 있어도 시세는 한 번만 조회하도록 캐시.
    const priceCache = new Map<number, number>();
    const currentPrice = async (apparelId: number): Promise<number> => {
      if (priceCache.has(apparelId)) return priceCache.get(apparelId)!;
      let price = 0;
      try {
        const p = await fetchApparelPrices(apparelId);
        price = p.single > 0 ? p.single : 0;
      } catch {
        price = 0;
      }
      priceCache.set(apparelId, price);
      return price;
    };

    for (const a of alerts) {
      const price = await currentPrice(a.snkrdunkApparelId);
      if (price <= 0 || price > a.targetPriceJpy) continue;

      // 시스템 발신자 보장 후 알림 메시지 발송 + 알림 비활성화(한 트랜잭션).
      await prisma.user.upsert({
        where: { id: SYSTEM_SENDER_ID },
        update: {},
        create: { id: SYSTEM_SENDER_ID, name: SYSTEM_SENDER_NAME },
      });
      const name = a.cardName || `카드 #${a.snkrdunkApparelId}`;
      const text =
        `🔔 가격 알림: ${name} 이(가) 목표가 ${fmtYen(a.targetPriceJpy)} 이하로 내려왔어요! ` +
        `현재 ${fmtYen(price)} · /cards/snkrdunk/${a.snkrdunkApparelId}`;
      await prisma.$transaction([
        prisma.message.create({
          data: { senderId: SYSTEM_SENDER_ID, receiverId: a.userId, text },
        }),
        prisma.priceAlert.update({
          where: { id: a.id },
          data: { triggeredAt: new Date() },
        }),
      ]);
      triggered += 1;
    }
  } catch (err) {
    console.error('[priceAlerts.check]', err);
  } finally {
    running = false;
  }
  return triggered;
}

let timer: ReturnType<typeof setInterval> | null = null;

/** 서버 부팅 시 1회 호출 — 주기 점검 시작(중복 호출 무시). */
export function startPriceAlertScheduler(intervalMs = PRICE_ALERT_INTERVAL_MS): void {
  if (timer) return;
  // 부팅 직후 한 번은 약간 지연시켜 시작(다른 부팅 작업과 겹치지 않게).
  setTimeout(() => {
    void runPriceAlertCheck();
  }, 60_000);
  timer = setInterval(() => {
    void runPriceAlertCheck();
  }, intervalMs);
  // 프로세스 종료를 막지 않도록.
  if (typeof timer.unref === 'function') timer.unref();
  console.log(`[priceAlerts] scheduler started (every ${Math.round(intervalMs / 60000)}m)`);
}
