-- Sweep B3: data only. The Store items copied from the avatar library in
-- 20261016120100_store were numbered newest first; members have always seen
-- the library oldest first, so keep that order. Only the copied rows
-- ("store_" ids) are renumbered, and no schema changes.
UPDATE "StoreItem" AS item
SET "sortOrder" = ordered.position
FROM (
    SELECT "id", (ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id"))::INTEGER - 1 AS position
    FROM "StoreItem"
    WHERE "id" LIKE 'store\_%' ESCAPE '\'
) AS ordered
WHERE item."id" = ordered."id";
