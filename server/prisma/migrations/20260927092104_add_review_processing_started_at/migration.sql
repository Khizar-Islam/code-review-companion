-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "processingStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: existing rows' current attempt is best approximated by createdAt,
-- so reviews already stuck in "pending" are immediately recognised as stale.
UPDATE "Review" SET "processingStartedAt" = "createdAt";
