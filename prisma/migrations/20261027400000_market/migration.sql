-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'ACTIVE', 'RESERVED', 'SOLD', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('REQUESTED', 'PAID', 'DELIVERED', 'COMPLETED', 'CANCELED', 'DISPUTED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "marketRulesAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MarketListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'HTG',
    "images" JSONB NOT NULL DEFAULT '[]',
    "details" JSONB NOT NULL DEFAULT '[]',
    "withEmail" BOOLEAN NOT NULL DEFAULT false,
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING',
    "staffNote" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketDeal" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "agentId" TEXT,
    "price" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "commission" INTEGER,
    "status" "DealStatus" NOT NULL DEFAULT 'REQUESTED',
    "history" JSONB NOT NULL DEFAULT '[]',
    "rating" INTEGER,
    "ratingNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketReport" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketListing_status_platform_idx" ON "MarketListing"("status", "platform");

-- CreateIndex
CREATE INDEX "MarketListing_sellerId_idx" ON "MarketListing"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketDeal_number_key" ON "MarketDeal"("number");

-- CreateIndex
CREATE INDEX "MarketDeal_status_idx" ON "MarketDeal"("status");

-- CreateIndex
CREATE INDEX "MarketDeal_buyerId_idx" ON "MarketDeal"("buyerId");

-- CreateIndex
CREATE INDEX "MarketDeal_sellerId_idx" ON "MarketDeal"("sellerId");

-- CreateIndex
CREATE INDEX "MarketReport_resolved_idx" ON "MarketReport"("resolved");

-- AddForeignKey
ALTER TABLE "MarketListing" ADD CONSTRAINT "MarketListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketDeal" ADD CONSTRAINT "MarketDeal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketDeal" ADD CONSTRAINT "MarketDeal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketDeal" ADD CONSTRAINT "MarketDeal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketReport" ADD CONSTRAINT "MarketReport_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketReport" ADD CONSTRAINT "MarketReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

