-- CreateTable
CREATE TABLE "MarketChat" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "agreedPrice" INTEGER,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyerReadAt" TIMESTAMP(3),
    "sellerReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "authorId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL DEFAULT '',
    "original" TEXT,
    "imagePath" TEXT,
    "offerAmount" INTEGER,
    "offerStatus" TEXT,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketChat_buyerId_lastAt_idx" ON "MarketChat"("buyerId", "lastAt");

-- CreateIndex
CREATE INDEX "MarketChat_sellerId_lastAt_idx" ON "MarketChat"("sellerId", "lastAt");

-- CreateIndex
CREATE INDEX "MarketChat_lastAt_idx" ON "MarketChat"("lastAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketChat_listingId_buyerId_key" ON "MarketChat"("listingId", "buyerId");

-- CreateIndex
CREATE INDEX "MarketMessage_chatId_createdAt_idx" ON "MarketMessage"("chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketChat" ADD CONSTRAINT "MarketChat_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketChat" ADD CONSTRAINT "MarketChat_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketChat" ADD CONSTRAINT "MarketChat_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketMessage" ADD CONSTRAINT "MarketMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "MarketChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketMessage" ADD CONSTRAINT "MarketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

