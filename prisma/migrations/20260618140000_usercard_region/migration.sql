-- 카드 발매 지역(에디션) — 자산 구성(일본판/한국판/영문판) 비중 산출용.
-- 멱등: 스키마는 admin 의 `prisma db push` 가 소유하므로 IF NOT EXISTS 로 작성.
ALTER TABLE "user_cards" ADD COLUMN IF NOT EXISTS "region" TEXT;
