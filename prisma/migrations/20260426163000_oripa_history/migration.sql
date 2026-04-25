-- CreateTable
CREATE TABLE "oripa_pack_history" (
    "id" SERIAL NOT NULL,
    "packId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oripa_pack_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oripa_pack_history_packId_createdAt_idx" ON "oripa_pack_history"("packId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "oripa_pack_history_createdAt_idx" ON "oripa_pack_history"("createdAt" DESC);
