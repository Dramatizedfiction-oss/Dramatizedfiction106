-- Sweep B3, stage 2: the Store. Additive only: one new table, plus a one-time
-- copy that gives every existing library avatar (PlatformAvatar) a Store item,
-- newest first as the library showed them. No existing row is changed.

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER,
    "platformAvatarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreItem_platformAvatarId_key" ON "StoreItem"("platformAvatarId");

-- CreateIndex
CREATE INDEX "StoreItem_category_active_sortOrder_idx" ON "StoreItem"("category", "active", "sortOrder");

-- AddForeignKey
ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_platformAvatarId_fkey" FOREIGN KEY ("platformAvatarId") REFERENCES "PlatformAvatar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One Store item per existing library avatar.
INSERT INTO "StoreItem" ("id", "category", "name", "imageUrl", "active", "sortOrder", "platformAvatarId", "createdAt", "updatedAt", "createdById")
SELECT
    'store_' || "id",
    'AVATAR',
    "label",
    "url",
    true,
    (ROW_NUMBER() OVER (ORDER BY "createdAt" DESC, "id"))::INTEGER - 1,
    "id",
    "createdAt",
    CURRENT_TIMESTAMP,
    "createdById"
FROM "PlatformAvatar";
