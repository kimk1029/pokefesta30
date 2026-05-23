-- Idempotent schema sync for snkrdunkApparelId + favorite_cards.
--
-- Why this exists: prisma migrate deploy is non-fatal in CI (admin
-- db push owns the live schema), so the 20260522170000 migration never
-- actually ran on prod. This file is executed by `prisma db execute`
-- on every deploy as a safety net — IF NOT EXISTS makes it safe to
-- re-run forever.

-- 1) UserCard.snkrdunkApparelId — needed for collection + portfolio.
ALTER TABLE "user_cards" ADD COLUMN IF NOT EXISTS "snkrdunkApparelId" INTEGER;
CREATE INDEX IF NOT EXISTS "user_cards_snkrdunkApparelId_idx"
  ON "user_cards" ("snkrdunkApparelId");

-- 2) FavoriteCard table — wishlist, separate from collection.
CREATE TABLE IF NOT EXISTS "favorite_cards" (
  "id" SERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "snkrdunkApparelId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FK can't be IF NOT EXISTS — guard via pg_constraint lookup.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorite_cards_userId_fkey'
  ) THEN
    ALTER TABLE "favorite_cards"
      ADD CONSTRAINT "favorite_cards_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "favorite_cards_userId_snkrdunkApparelId_key"
  ON "favorite_cards" ("userId", "snkrdunkApparelId");

CREATE INDEX IF NOT EXISTS "favorite_cards_userId_createdAt_idx"
  ON "favorite_cards" ("userId", "createdAt" DESC);

-- 3) PortfolioDailySnapshot — 등락율/차트용 일별 스냅샷.
CREATE TABLE IF NOT EXISTS "portfolio_daily_snapshots" (
  "id" SERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "totalJpy" INTEGER NOT NULL,
  "pricedCount" INTEGER NOT NULL,
  "totalCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_daily_snapshots_userId_fkey'
  ) THEN
    ALTER TABLE "portfolio_daily_snapshots"
      ADD CONSTRAINT "portfolio_daily_snapshots_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_daily_snapshots_userId_date_key"
  ON "portfolio_daily_snapshots" ("userId", "date");

CREATE INDEX IF NOT EXISTS "portfolio_daily_snapshots_userId_date_idx"
  ON "portfolio_daily_snapshots" ("userId", "date" DESC);
