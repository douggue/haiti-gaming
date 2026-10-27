-- AlterTable
ALTER TABLE "MarketChat" ADD COLUMN     "agentCalledAt" TIMESTAMP(3),
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "reopenAt" TIMESTAMP(3),
ADD COLUMN     "reopenById" TEXT,
ADD COLUMN     "reopenReason" TEXT;

-- AlterTable
ALTER TABLE "MarketListing" ADD COLUMN     "credentials" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

