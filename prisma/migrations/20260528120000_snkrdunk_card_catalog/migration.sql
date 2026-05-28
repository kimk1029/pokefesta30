-- CreateTable
CREATE TABLE "snkrdunk_cards" (
    "apparelId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "localizedName" TEXT NOT NULL DEFAULT '',
    "koName" TEXT NOT NULL DEFAULT '',
    "itemKind" TEXT NOT NULL DEFAULT 'single',
    "shortName" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "productNumber" TEXT NOT NULL DEFAULT '',
    "releasedAt" TEXT,
    "packCode" TEXT,
    "apparelGroupId" INTEGER,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "snkrdunk_cards_pkey" PRIMARY KEY ("apparelId")
);

-- CreateTable
CREATE TABLE "snkrdunk_price_snapshots" (
    "id" SERIAL NOT NULL,
    "apparelId" INTEGER NOT NULL,
    "minPrice" INTEGER NOT NULL,
    "listingCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snkrdunk_price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "snkrdunk_cards_packCode_idx" ON "snkrdunk_cards"("packCode");

-- CreateIndex
CREATE INDEX "snkrdunk_price_snapshots_apparelId_fetchedAt_idx" ON "snkrdunk_price_snapshots"("apparelId", "fetchedAt" DESC);
