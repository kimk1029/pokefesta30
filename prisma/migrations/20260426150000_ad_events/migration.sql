-- CreateTable
CREATE TABLE "ad_events" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "userId" TEXT,
    "reward" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT,
    "ua" TEXT,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_events_kind_day_idx" ON "ad_events"("kind", "day");

-- CreateIndex
CREATE INDEX "ad_events_network_day_idx" ON "ad_events"("network", "day");

-- CreateIndex
CREATE INDEX "ad_events_userId_kind_day_idx" ON "ad_events"("userId", "kind", "day");

-- CreateIndex
CREATE INDEX "ad_events_createdAt_idx" ON "ad_events"("createdAt");
