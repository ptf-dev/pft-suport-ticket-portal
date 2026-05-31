-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- Backfill existing RESOLVED tickets with a best-guess resolved time (last update)
UPDATE "tickets" SET "resolvedAt" = "updatedAt" WHERE "status" = 'RESOLVED' AND "resolvedAt" IS NULL;

-- CreateIndex
CREATE INDEX "tickets_resolvedAt_idx" ON "tickets"("resolvedAt");
