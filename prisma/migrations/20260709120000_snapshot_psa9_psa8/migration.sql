-- 스니덩 시세 스냅샷에 PSA9/PSA8 시세 컬럼 추가 — 등급카드 등록가/등락률 기준.
ALTER TABLE "snkrdunk_price_snapshots"
  ADD COLUMN IF NOT EXISTS "pricePsa9" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pricePsa8" INTEGER NOT NULL DEFAULT 0;
