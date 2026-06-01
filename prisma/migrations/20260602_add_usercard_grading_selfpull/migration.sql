-- AlterTable: 직접뽑기 플래그 + 등급(그레이딩) 정보 추가
ALTER TABLE "user_cards"
  ADD COLUMN "selfPulled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "graded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "gradeCompany" TEXT,
  ADD COLUMN "gradeValue" TEXT;
