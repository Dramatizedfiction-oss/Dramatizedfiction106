-- Sweep 7: voluntary 18+ confirmation on the Account page. Additive only:
-- two nullable columns; existing members are unconfirmed (NULL). The birthdate
-- itself is never stored.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ageConfirmationVersion" TEXT,
ADD COLUMN     "ageConfirmedAt" TIMESTAMP(3);
