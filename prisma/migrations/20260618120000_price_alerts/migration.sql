-- 가격 알림 (price_alerts) — 카드 시세가 목표가 이하로 내려오면 알림 발송.
-- 멱등: 스키마는 admin 워크플로의 `prisma db push` 가 소유하므로, migrate deploy 가
-- drift 로 no-op 되더라도 깨지지 않도록 IF NOT EXISTS 로 작성.
CREATE TABLE IF NOT EXISTS "price_alerts" (
    "id" SERIAL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "snkrdunkApparelId" INTEGER NOT NULL,
    "targetPriceJpy" INTEGER NOT NULL,
    "cardName" TEXT,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_alerts_userId_fkey" FOREIGN KEY ("userId")
      REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "price_alerts_userId_snkrdunkApparelId_key"
  ON "price_alerts" ("userId", "snkrdunkApparelId");

CREATE INDEX IF NOT EXISTS "price_alerts_userId_createdAt_idx"
  ON "price_alerts" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "price_alerts_triggeredAt_idx"
  ON "price_alerts" ("triggeredAt");
