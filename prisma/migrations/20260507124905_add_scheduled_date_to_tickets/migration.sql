-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "scheduledDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tickets_scheduledDate_idx" ON "tickets"("scheduledDate");
