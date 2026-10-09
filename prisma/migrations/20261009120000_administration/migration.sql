-- Administration + CEO Studio.
-- Additive only: one enum, three new tables, six new Settings columns (all
-- nullable or with a default), indexes and foreign keys. No existing column,
-- row or constraint is changed or dropped, so existing users, content and the
-- current phase flags are untouched (renovationMode defaults to false).
--
--   MemberRestriction  permanent bans and one-month discipline actions
--   AdminAuditLog      who performed a sensitive administrative action, when
--   PlatformAvatar     Administration's shared avatar library
--   Settings.*         renovation mode, default avatar choices, phase activation times

-- CreateEnum
CREATE TYPE "RestrictionKind" AS ENUM ('BAN', 'DISCIPLINE');

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "defaultReaderAvatarId" TEXT,
ADD COLUMN     "defaultWriterAvatarId" TEXT,
ADD COLUMN     "phaseThreeActivatedAt" TIMESTAMP(3),
ADD COLUMN     "phaseTwoActivatedAt" TIMESTAMP(3),
ADD COLUMN     "renovationChangedAt" TIMESTAMP(3),
ADD COLUMN     "renovationMode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MemberRestriction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "RestrictionKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "imposedById" TEXT,
    "imposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "liftedById" TEXT,
    "liftedAt" TIMESTAMP(3),
    "liftNote" TEXT,

    CONSTRAINT "MemberRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "targetUserId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAvatar" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "PlatformAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberRestriction_userId_liftedAt_idx" ON "MemberRestriction"("userId", "liftedAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorId_action_createdAt_idx" ON "AdminAuditLog"("actorId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_createdAt_idx" ON "AdminAuditLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAvatar_url_key" ON "PlatformAvatar"("url");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_defaultReaderAvatarId_fkey" FOREIGN KEY ("defaultReaderAvatarId") REFERENCES "PlatformAvatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_defaultWriterAvatarId_fkey" FOREIGN KEY ("defaultWriterAvatarId") REFERENCES "PlatformAvatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRestriction" ADD CONSTRAINT "MemberRestriction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRestriction" ADD CONSTRAINT "MemberRestriction_imposedById_fkey" FOREIGN KEY ("imposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRestriction" ADD CONSTRAINT "MemberRestriction_liftedById_fkey" FOREIGN KEY ("liftedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAvatar" ADD CONSTRAINT "PlatformAvatar_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

