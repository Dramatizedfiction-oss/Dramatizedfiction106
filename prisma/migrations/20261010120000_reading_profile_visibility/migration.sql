-- Sweep 6: reading-profile visibility. Additive only: one enum and one column
-- with a default, so every existing member starts PRIVATE (the 5A default).

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "readingProfileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE';
