-- CreateTable
CREATE TABLE "listing_favorites" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "price" INTEGER,
    "url" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_favorites_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "listing_favorites_userId_source_createdAt_idx" ON "listing_favorites"("userId", "source", "createdAt" DESC);
-- CreateIndex
CREATE UNIQUE INDEX "listing_favorites_userId_source_externalId_key" ON "listing_favorites"("userId", "source", "externalId");
-- AddForeignKey
ALTER TABLE "listing_favorites" ADD CONSTRAINT "listing_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
