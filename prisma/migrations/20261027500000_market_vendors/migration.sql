-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "MarketVendor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "platforms" TEXT[],
    "volume" TEXT NOT NULL,
    "about" TEXT NOT NULL DEFAULT '',
    "idPhotoPath" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'PENDING',
    "staffNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketVendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketVendor_userId_key" ON "MarketVendor"("userId");

-- CreateIndex
CREATE INDEX "MarketVendor_status_idx" ON "MarketVendor"("status");

-- AddForeignKey
ALTER TABLE "MarketVendor" ADD CONSTRAINT "MarketVendor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

