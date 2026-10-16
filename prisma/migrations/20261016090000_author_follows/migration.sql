-- Sweep B2: following authors on the account (was device-only localStorage),
-- the follower-list privacy switch, and a DB-backed rate limit table.
-- Additive only: one new column with a default, two new tables.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "followerListVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateTable
CREATE TABLE "AuthorFollow" (
    "followerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorFollow_pkey" PRIMARY KEY ("followerId","authorId")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorFollow_followerId_createdAt_idx" ON "AuthorFollow"("followerId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthorFollow_authorId_createdAt_idx" ON "AuthorFollow"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitHit_userId_action_createdAt_idx" ON "RateLimitHit"("userId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitHit_createdAt_idx" ON "RateLimitHit"("createdAt");

-- AddForeignKey
ALTER TABLE "AuthorFollow" ADD CONSTRAINT "AuthorFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorFollow" ADD CONSTRAINT "AuthorFollow_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimitHit" ADD CONSTRAINT "RateLimitHit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written (Prisma doesn't model CHECK constraints): nobody follows themselves.
ALTER TABLE "AuthorFollow" ADD CONSTRAINT "AuthorFollow_not_self" CHECK ("followerId" <> "authorId");
