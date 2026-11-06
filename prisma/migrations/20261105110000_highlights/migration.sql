-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "quote" TEXT,
ADD COLUMN     "quotePrefix" TEXT,
ADD COLUMN     "quoteSuffix" TEXT;

-- CreateTable
CREATE TABLE "Highlight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "quotePrefix" TEXT NOT NULL DEFAULT '',
    "quoteSuffix" TEXT NOT NULL DEFAULT '',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Highlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Highlight_userId_createdAt_idx" ON "Highlight"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Highlight_episodeId_idx" ON "Highlight"("episodeId");

-- AddForeignKey
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written (Sweep I): length checks `migrate diff` can't express.
-- ---------------------------------------------------------------------------
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_quote_check"
  CHECK ("quote" IS NULL OR char_length("quote") BETWEEN 1 AND 300);
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_quote_context_check"
  CHECK (char_length(coalesce("quotePrefix", '')) <= 64 AND char_length(coalesce("quoteSuffix", '')) <= 64);
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_quote_check" CHECK (char_length("quote") BETWEEN 1 AND 300);
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_quote_context_check"
  CHECK (char_length("quotePrefix") <= 64 AND char_length("quoteSuffix") <= 64);
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_note_check" CHECK ("note" IS NULL OR char_length("note") <= 1000);