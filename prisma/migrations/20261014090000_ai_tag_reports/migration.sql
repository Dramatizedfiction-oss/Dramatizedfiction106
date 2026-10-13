-- CreateTable
CREATE TABLE "AiTagReport" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "episodeId" TEXT,
    "reporterId" TEXT,
    "suggestedTag" "AiUsageTag",
    "note" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "AiTagReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiTagReport_status_createdAt_idx" ON "AiTagReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AiTagReport_reporterId_seriesId_idx" ON "AiTagReport"("reporterId", "seriesId");

-- AddForeignKey
ALTER TABLE "AiTagReport" ADD CONSTRAINT "AiTagReport_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTagReport" ADD CONSTRAINT "AiTagReport_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTagReport" ADD CONSTRAINT "AiTagReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTagReport" ADD CONSTRAINT "AiTagReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

