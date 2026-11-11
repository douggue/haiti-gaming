-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "productSlug" TEXT,
    "visitorHash" TEXT NOT NULL,
    "referrerHost" TEXT,
    "source" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "device" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "dataSaver" BOOLEAN NOT NULL DEFAULT false,
    "query" TEXT,
    "results" INTEGER,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDaily" (
    "day" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL,
    "pageviews" INTEGER NOT NULL,

    CONSTRAINT "AnalyticsDaily_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_at_idx" ON "AnalyticsEvent"("at");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_at_idx" ON "AnalyticsEvent"("type", "at");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorHash_at_idx" ON "AnalyticsEvent"("visitorHash", "at");

