-- CreateEnum
CREATE TYPE "SeriesModeration" AS ENUM ('VISIBLE', 'IN_REVIEW', 'HELD', 'BLOCKED');

-- AlterTable
ALTER TABLE "Series" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "moderationStatus" "SeriesModeration" NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "ReadingProgress" ADD COLUMN     "finishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SeriesStats" (
    "seriesId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "tags" TEXT[],
    "isComplete" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMP(3),
    "episodeCount" INTEGER NOT NULL,
    "totalReadMinutes" INTEGER NOT NULL,
    "firstPublishedAt" TIMESTAMP(3),
    "lastPublishedAt" TIMESTAMP(3),
    "ratingCount" INTEGER NOT NULL,
    "ratingSum" INTEGER NOT NULL,
    "bookmarkCount" INTEGER NOT NULL,
    "followCount" INTEGER NOT NULL,
    "readsTotal" INTEGER NOT NULL,
    "reads7d" DOUBLE PRECISION NOT NULL,
    "completions7d" DOUBLE PRECISION NOT NULL,
    "newBookmarks7d" DOUBLE PRECISION NOT NULL,
    "newFollows7d" DOUBLE PRECISION NOT NULL,
    "newRatings7d" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeriesStats_pkey" PRIMARY KEY ("seriesId")
);

-- CreateTable
CREATE TABLE "FeedShelf" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weight" DOUBLE PRECISION NOT NULL,
    "minItems" INTEGER NOT NULL DEFAULT 4,
    "maxItems" INTEGER NOT NULL DEFAULT 12,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "months" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "FeedShelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedShelfItem" (
    "shelfId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedShelfItem_pkey" PRIMARY KEY ("shelfId","seriesId")
);

-- CreateTable
CREATE TABLE "WriterExposure" (
    "authorId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WriterExposure_pkey" PRIMARY KEY ("authorId","day")
);

-- CreateIndex
CREATE INDEX "SeriesStats_lastPublishedAt_idx" ON "SeriesStats"("lastPublishedAt");

-- CreateIndex
CREATE INDEX "SeriesStats_authorId_idx" ON "SeriesStats"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedShelf_key_key" ON "FeedShelf"("key");

-- CreateIndex
CREATE INDEX "FeedShelf_enabled_sortOrder_idx" ON "FeedShelf"("enabled", "sortOrder");

-- CreateIndex
CREATE INDEX "FeedShelfItem_seriesId_idx" ON "FeedShelfItem"("seriesId");

-- CreateIndex
CREATE INDEX "WriterExposure_day_idx" ON "WriterExposure"("day");

-- CreateIndex
CREATE INDEX "SeriesFollow_seriesId_createdAt_idx" ON "SeriesFollow"("seriesId", "createdAt");

-- CreateIndex
CREATE INDEX "Episode_seriesId_status_publishedAt_idx" ON "Episode"("seriesId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Episode_authorId_status_publishedAt_idx" ON "Episode"("authorId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "ReadingProgress_episodeId_finishedAt_idx" ON "ReadingProgress"("episodeId", "finishedAt");

-- CreateIndex
CREATE INDEX "Bookmark_episodeId_createdAt_idx" ON "Bookmark"("episodeId", "createdAt");

-- AddForeignKey
ALTER TABLE "SeriesStats" ADD CONSTRAINT "SeriesStats_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedShelf" ADD CONSTRAINT "FeedShelf_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedShelfItem" ADD CONSTRAINT "FeedShelfItem_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "FeedShelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedShelfItem" ADD CONSTRAINT "FeedShelfItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedShelfItem" ADD CONSTRAINT "FeedShelfItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WriterExposure" ADD CONSTRAINT "WriterExposure_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill (Sweep C): completions already reached get their last save time;
-- series already marked complete use their latest published episode.
UPDATE "ReadingProgress" SET "finishedAt" = "updatedAt" WHERE "percent" >= 95 AND "finishedAt" IS NULL;
UPDATE "Series" s SET "completedAt" = COALESCE(
  (SELECT max(e."publishedAt") FROM "Episode" e WHERE e."seriesId" = s.id AND e.status = 'PUBLISHED'), s."updatedAt")
WHERE s."isComplete" = true AND s."completedAt" IS NULL;

-- Built-in feed shelves (Sweep C). Rules and tiers: lib/feed/config.ts.
INSERT INTO "FeedShelf" ("id", "key", "name", "tier", "rule", "genres", "tags", "weight", "minItems", "maxItems", "enabled", "sortOrder", "builtIn", "months", "updatedAt") VALUES
  ('shelf_new_writers',        'new-writers',        'New Writers',                     'BIG',   'NEW_WRITERS',        '{}', '{}', 10,  4, 12, true,  1,  true, '{}', now()),
  ('shelf_continue_reading',   'continue-reading',   'Continue Reading',                'BIG',   'CONTINUE_READING',   '{}', '{}', 10,  1, 12, true,  2,  true, '{}', now()),
  ('shelf_because_you_liked',  'because-you-liked',  'Because you liked',               'BIG',   'BECAUSE_YOU_LIKED',  '{}', '{}', 8,   4, 12, true,  3,  true, '{}', now()),
  ('shelf_trending',           'trending',           'Trending',                        'BIG',   'TRENDING',           '{}', '{}', 8,   4, 12, true,  4,  true, '{}', now()),
  ('shelf_just_updated',       'just-updated',       'Just Updated',                    'BIG',   'JUST_UPDATED',       '{}', '{}', 7,   4, 12, true,  5,  true, '{}', now()),
  ('shelf_trending_top_genre', 'trending-top-genre', 'Trending in your top genre',      'BIG',   'TRENDING_TOP_GENRE', '{}', '{}', 7,   4, 12, true,  6,  true, '{}', now()),
  ('shelf_top_rated',          'top-rated',          'Top Rated',                       'BIG',   'TOP_RATED',          '{}', '{}', 6,   4, 12, true,  7,  true, '{}', now()),
  ('shelf_completed',          'completed',          'Completed and Ready to Binge',    'BIG',   'COMPLETED',          '{}', '{}', 6,   4, 12, true,  8,  true, '{}', now()),
  ('shelf_trending_romance',   'trending-romance',   'Trending Romance',                'GENRE', 'TRENDING_GENRE',     '{romance}', '{}', 3, 4, 12, true, 10, true, '{}', now()),
  ('shelf_trending_fantasy',   'trending-fantasy',   'Fantasy',                         'GENRE', 'TRENDING_GENRE',     '{fantasy}', '{}', 3, 4, 12, true, 11, true, '{}', now()),
  ('shelf_trending_scifi',     'trending-sci-fi',    'Sci-fi',                          'GENRE', 'TRENDING_GENRE',     '{sci-fi}', '{}', 3, 4, 12, true, 12, true, '{}', now()),
  ('shelf_trending_mystery',   'trending-mystery-thriller', 'Mystery and Thriller',     'GENRE', 'TRENDING_GENRE',     '{mystery,thriller}', '{}', 3, 4, 12, true, 13, true, '{}', now()),
  ('shelf_trending_horror',    'trending-horror',    'Horror',                          'GENRE', 'TRENDING_GENRE',     '{horror}', '{}', 3, 4, 12, true, 14, true, '{}', now()),
  ('shelf_trending_ya',        'trending-young-adult', 'Young Adult',                   'GENRE', 'TRENDING_GENRE',     '{}', '{"Young adult"}', 3, 4, 12, true, 15, true, '{}', now()),
  ('shelf_trending_historical','trending-historical','Historical',                      'GENRE', 'TRENDING_GENRE',     '{historical}', '{}', 3, 4, 12, true, 16, true, '{}', now()),
  ('shelf_trending_comedy',    'trending-comedy',    'Comedy',                          'GENRE', 'TRENDING_GENRE',     '{comedy}', '{}', 3, 4, 12, true, 17, true, '{}', now()),
  ('shelf_hidden_gems',        'hidden-gems',        'Hidden Gems',                     'NICHE', 'HIDDEN_GEMS',        '{}', '{}', 1.5, 4, 12, true, 20, true, '{}', now()),
  ('shelf_quick_reads',        'quick-reads',        'Quick Reads',                     'NICHE', 'QUICK_READS',        '{}', '{}', 1.5, 4, 12, true, 21, true, '{}', now()),
  ('shelf_weekend_binges',     'weekend-binges',     'Weekend Binges',                  'NICHE', 'WEEKEND_BINGES',     '{}', '{}', 1.5, 4, 12, true, 22, true, '{}', now()),
  ('shelf_fresh_finishes',     'fresh-finishes',     'Fresh Finishes',                  'NICHE', 'FRESH_FINISHES',     '{}', '{}', 1.5, 4, 12, true, 23, true, '{}', now()),
  ('shelf_followed_writers',   'followed-writers',   'Updates from Writers You Follow', 'NICHE', 'FOLLOWED_WRITERS',   '{}', '{}', 1.5, 2, 12, true, 24, true, '{}', now()),
  ('shelf_staff_picks',        'staff-picks',        'Staff Picks',                     'NICHE', 'STAFF_PICKS',        '{}', '{}', 1.5, 4, 20, true, 25, true, '{}', now()),
  ('shelf_slow_burn_romance',  'slow-burn-romance',  'Slow Burn Romance',               'NICHE', 'TAGS', '{romance}', '{"Slow burn"}', 1, 4, 12, true, 30, true, '{}', now()),
  ('shelf_enemies_to_lovers',  'enemies-to-lovers',  'Enemies to Lovers',               'NICHE', 'TAGS', '{}', '{"Enemies to lovers"}', 1, 4, 12, true, 31, true, '{}', now()),
  ('shelf_found_family',       'found-family',       'Found Family',                    'NICHE', 'TAGS', '{}', '{"Found family"}', 1, 4, 12, true, 32, true, '{}', now()),
  ('shelf_cozy_mysteries',     'cozy-mysteries',     'Cozy Mysteries',                  'NICHE', 'TAGS', '{mystery}', '{Cosy}', 1, 4, 12, true, 33, true, '{}', now()),
  ('shelf_ghost_stories',      'ghost-stories',      'Ghost Stories',                   'NICHE', 'TAGS', '{}', '{Ghosts}', 1, 4, 12, true, 34, true, '{}', now()),
  ('shelf_dark_fantasy',       'dark-fantasy',       'Dark Fantasy',                    'NICHE', 'TAGS', '{}', '{"Dark fantasy"}', 1, 4, 12, true, 35, true, '{}', now()),
  ('shelf_space_opera',        'space-opera',        'Space Opera',                     'NICHE', 'TAGS', '{sci-fi}', '{Space}', 1, 4, 12, true, 36, true, '{}', now()),
  ('shelf_dystopian',          'dystopian',          'Dystopian',                       'NICHE', 'TAGS', '{}', '{Dystopian}', 1, 4, 12, true, 37, true, '{}', now()),
  ('shelf_small_town',         'small-town',         'Small-Town Stories',              'NICHE', 'TAGS', '{}', '{"Small town"}', 1, 4, 12, true, 38, true, '{}', now()),
  ('shelf_time_travel',        'time-travel',        'Time Travel',                     'NICHE', 'TAGS', '{}', '{"Time travel"}', 1, 4, 12, true, 39, true, '{}', now()),
  ('shelf_mythology',          'mythology',          'Mythology',                       'NICHE', 'TAGS', '{}', '{Mythology}', 1, 4, 12, true, 40, true, '{}', now()),
  ('shelf_spooky_season',      'spooky-season',      'Spooky Season',                   'NICHE', 'TAGS', '{}', '{Ghosts,Gothic,"Folk horror",Paranormal}', 1, 4, 12, false, 50, true, '{10}', now()),
  ('shelf_winter_cosy',        'winter-cosy',        'Winter Cosy',                     'NICHE', 'TAGS', '{}', '{Cosy}', 1, 4, 12, false, 51, true, '{12,1,2}', now())
ON CONFLICT ("key") DO NOTHING;