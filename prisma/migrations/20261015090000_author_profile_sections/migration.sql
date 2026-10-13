-- CreateEnum
CREATE TYPE "ProfileLibraryKind" AS ENUM ('BOOK', 'SERIES');

-- AlterTable
ALTER TABLE "AuthorProfile" ADD COLUMN     "showAbout" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showBio" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLibrary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLinks" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showOnSite" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ProfileLibraryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "ProfileLibraryKind" NOT NULL,
    "seriesId" TEXT,
    "title" TEXT,
    "note" TEXT,
    "url" TEXT,
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileAboutCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileAboutCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "subtext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileLibraryItem_userId_position_idx" ON "ProfileLibraryItem"("userId", "position");

-- CreateIndex
CREATE INDEX "ProfileLibraryItem_seriesId_idx" ON "ProfileLibraryItem"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileLibraryItem_userId_seriesId_key" ON "ProfileLibraryItem"("userId", "seriesId");

-- CreateIndex
CREATE INDEX "ProfileAboutCard_userId_position_idx" ON "ProfileAboutCard"("userId", "position");

-- CreateIndex
CREATE INDEX "ProfileLink_userId_position_idx" ON "ProfileLink"("userId", "position");

-- AddForeignKey
ALTER TABLE "ProfileLibraryItem" ADD CONSTRAINT "ProfileLibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileLibraryItem" ADD CONSTRAINT "ProfileLibraryItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAboutCard" ADD CONSTRAINT "ProfileAboutCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Copy the old fixed profile links (User.websiteUrl, twitterUrl, instagramUrl,
-- youtubeUrl, discordUrl) into the new list, in that order. The old columns are
-- left as they are (no longer read by the author page). Additive only.
INSERT INTO "ProfileLink" ("id", "userId", "position", "label", "url", "updatedAt")
SELECT gen_random_uuid()::text, l."userId", l."position", l."label", l."url", CURRENT_TIMESTAMP
FROM (
  SELECT u."id" AS "userId", v."position", v."label", v."url"
  FROM "User" u
  CROSS JOIN LATERAL (VALUES
    (0, 'Website', u."websiteUrl"),
    (1, 'X', u."twitterUrl"),
    (2, 'Instagram', u."instagramUrl"),
    (3, 'YouTube', u."youtubeUrl"),
    (4, 'Discord', u."discordUrl")
  ) AS v("position", "label", "url")
  WHERE v."url" IS NOT NULL AND btrim(v."url") <> ''
) l;