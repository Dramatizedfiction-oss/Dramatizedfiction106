-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hideLevelFrame" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selectedFrameId" TEXT;

-- CreateIndex
CREATE INDEX "User_selectedFrameId_idx" ON "User"("selectedFrameId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedFrameId_fkey" FOREIGN KEY ("selectedFrameId") REFERENCES "StoreItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

