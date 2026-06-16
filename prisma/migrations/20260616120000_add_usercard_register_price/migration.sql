-- AlterTable: 등록 시점 싱글 시세(JPY) 기준값 — 컬렉션 리스트 등락률용.
ALTER TABLE "user_cards"
  ADD COLUMN "registerPriceJpy" INTEGER;
