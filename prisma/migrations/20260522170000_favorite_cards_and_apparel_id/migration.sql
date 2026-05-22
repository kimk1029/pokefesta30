-- Add snkrdunkApparelId to user_cards so collection adds from the snkrdunk
-- price detail page can be priced later via the snkrdunk apparel API.
ALTER TABLE "user_cards" ADD COLUMN "snkrdunkApparelId" INTEGER;

CREATE INDEX "user_cards_snkrdunkApparelId_idx" ON "user_cards" ("snkrdunkApparelId");

-- 관심카드 (favorites) — separate from collection. Tracked but excluded from
-- portfolio total.
CREATE TABLE "favorite_cards" (
    "id" SERIAL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "snkrdunkApparelId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorite_cards_userId_fkey" FOREIGN KEY ("userId")
      REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "favorite_cards_userId_snkrdunkApparelId_key"
  ON "favorite_cards" ("userId", "snkrdunkApparelId");

CREATE INDEX "favorite_cards_userId_createdAt_idx"
  ON "favorite_cards" ("userId", "createdAt" DESC);
