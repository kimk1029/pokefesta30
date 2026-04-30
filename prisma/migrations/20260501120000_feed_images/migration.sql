-- Feed: 첨부 사진 URL 배열 (Vercel Blob URL). 상세 펼침 시에만 노출.
ALTER TABLE "feeds" ADD COLUMN IF NOT EXISTS "images" JSONB;
