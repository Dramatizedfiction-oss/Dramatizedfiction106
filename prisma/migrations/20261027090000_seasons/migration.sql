-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('ONGOING', 'COMPLETE');

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "seasonEpisodeNumber" INTEGER,
ADD COLUMN     "seasonId" TEXT;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" "SeasonStatus" NOT NULL DEFAULT 'ONGOING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_seriesId_number_key" ON "Season"("seriesId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Season_id_seriesId_key" ON "Season"("id", "seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seasonId_seasonEpisodeNumber_key" ON "Episode"("seasonId", "seasonEpisodeNumber");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonId_seriesId_fkey" FOREIGN KEY ("seasonId", "seriesId") REFERENCES "Season"("id", "seriesId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Hand-written (Sweep G): checks `migrate diff` can't express, then the backfill.
-- ---------------------------------------------------------------------------

ALTER TABLE "Season" ADD CONSTRAINT "Season_number_check" CHECK ("number" >= 1);
ALTER TABLE "Season" ADD CONSTRAINT "Season_title_length_check" CHECK ("title" IS NULL OR char_length("title") <= 60);
ALTER TABLE "Season" ADD CONSTRAINT "Season_description_length_check" CHECK ("description" IS NULL OR char_length("description") <= 300);
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonEpisodeNumber_check" CHECK ("seasonEpisodeNumber" IS NULL OR "seasonEpisodeNumber" >= 1);

-- One untitled "Season 1" per series (safe to re-run), complete if the series is.
INSERT INTO "Season" ("id", "seriesId", "number", "status", "completedAt", "createdAt", "updatedAt")
SELECT 'season1-' || s."id", s."id", 1,
       CASE WHEN s."isComplete" THEN 'COMPLETE'::"SeasonStatus" ELSE 'ONGOING'::"SeasonStatus" END,
       s."completedAt", s."createdAt", CURRENT_TIMESTAMP
FROM "Series" s
WHERE NOT EXISTS (SELECT 1 FROM "Season" x WHERE x."seriesId" = s."id");

-- Every episode into its series' Season 1, keeping its number, so the order
-- and every label stay exactly as they are. No existing column changes.
UPDATE "Episode" e
SET "seasonId" = 'season1-' || e."seriesId", "seasonEpisodeNumber" = e."episodeNumber"
WHERE e."seasonId" IS NULL;

