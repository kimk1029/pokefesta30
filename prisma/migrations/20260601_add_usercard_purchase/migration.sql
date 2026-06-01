-- AlterTable: 구매 정보(구매가/통화/수량/구매시기) 추가
ALTER TABLE "user_cards"
  ADD COLUMN "buyPrice" INTEGER,
  ADD COLUMN "buyCurrency" TEXT DEFAULT 'KRW',
  ADD COLUMN "qty" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "buyDate" TEXT;
