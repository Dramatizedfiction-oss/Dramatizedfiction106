-- Sweep 5B: follow a SERIES (separate from following an author) + the reader Library.
-- Adds one table. The only change to an existing table is a one-time reset of
-- "Series"."followers" to 0 (approved by the user: the old numbers were never
-- backed by real follows). From here on lib/series-follows.ts keeps that column
-- equal to the number of SeriesFollow rows, inside each follow/unfollow transaction.

-- CreateTable
CREATE TABLE "SeriesFollow" (
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeriesFollow_pkey" PRIMARY KEY ("userId","seriesId")
);

-- CreateIndex
CREATE INDEX "SeriesFollow_userId_createdAt_idx" ON "SeriesFollow"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SeriesFollow_seriesId_idx" ON "SeriesFollow"("seriesId");

-- AddForeignKey
ALTER TABLE "SeriesFollow" ADD CONSTRAINT "SeriesFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesFollow" ADD CONSTRAINT "SeriesFollow_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One-time reset: no real follows exist yet, so every count starts at 0.
UPDATE "Series" SET "followers" = 0;

-- Keep "Series"."followers" equal to its SeriesFollow row count in every case:
-- app follow/unfollow, and rows removed by cascade when a member is deleted.
-- Each change is a relative +1/-1 on the series row (row-locked, so concurrent
-- follows can't lose an update). Prisma does not model triggers; this is
-- documented on the SeriesFollow model in schema.prisma.
CREATE OR REPLACE FUNCTION "series_follow_count"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "Series" SET "followers" = "followers" + 1 WHERE "id" = NEW."seriesId";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "Series" SET "followers" = GREATEST("followers" - 1, 0) WHERE "id" = OLD."seriesId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SeriesFollow_count"
AFTER INSERT OR DELETE ON "SeriesFollow"
FOR EACH ROW EXECUTE FUNCTION "series_follow_count"();
