-- App-level role migration for Dramatized Fiction.
-- Preserves existing users by mapping legacy AUTHOR -> WRITER and ADMIN -> BOARD.

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('READER', 'WRITER', 'BOARD', 'CEO');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE "role"::text
      WHEN 'AUTHOR' THEN 'WRITER'
      WHEN 'ADMIN' THEN 'BOARD'
      WHEN 'WRITER' THEN 'WRITER'
      WHEN 'BOARD' THEN 'BOARD'
      WHEN 'CEO' THEN 'CEO'
      ELSE 'READER'
    END
  )::"Role";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'READER';

DROP TYPE "Role_old";
