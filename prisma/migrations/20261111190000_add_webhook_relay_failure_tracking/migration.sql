-- AlterTable
ALTER TABLE "webhook_relays" ADD COLUMN "lastFailureAt" TIMESTAMP(3);
ALTER TABLE "webhook_relays" ADD COLUMN "lastFailureError" TEXT;
