-- CreateTable
CREATE TABLE "action_logs" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '',
    "target" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'web',
    "userId" TEXT,
    "anonId" TEXT,
    "ip" TEXT,
    "ua" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "action_logs_createdAt_idx" ON "action_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "action_logs_type_createdAt_idx" ON "action_logs"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "action_logs_path_createdAt_idx" ON "action_logs"("path", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "action_logs_userId_idx" ON "action_logs"("userId");

-- CreateIndex
CREATE INDEX "action_logs_anonId_idx" ON "action_logs"("anonId");
